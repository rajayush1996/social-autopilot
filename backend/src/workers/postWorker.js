import { Worker } from 'bullmq';
import { POST_QUEUE_NAME } from '../queues/postQueue.js';
import { redisConnectionOptions } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { POST_STATUS, SOCIAL_PLATFORM, SOCIAL_POST_STATUS } from '../config/constants.js';
import SocialAdapterFactory from '../services/social/socialAdapterFactory.js';
import { getValidAccessToken } from '../services/auth/tokenManager.js';
import socketManager from '../services/socketService.js';
import NotificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';
import { convertMarkdownToUnicode } from '../utils/textFormatter.js';
import { updateUserMemory } from '../services/ai/memoryService.js';
import fs from 'fs';
import path from 'path';

/**
 * Execute publishing logic for a specific post.
 */
export async function processPostPublishing(postId) {
  logger.info(`[BullMQ Worker] 🚀 Processing post job for Post ID: ${postId}`);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: {
        include: {
          socialAccounts: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  if (!post) {
    logger.warn(`[BullMQ Worker] Post ID ${postId} not found in database. Skipping.`);
    return { status: 'SKIPPED', reason: 'Post not found' };
  }

  if (post.status === POST_STATUS.CANCELLED) {
    logger.info(`[BullMQ Worker] Post ID ${postId} is CANCELLED. Skipping processing.`);
    return { status: 'SKIPPED', reason: 'Post cancelled' };
  }

  // Atomic Lock: Prevent duplicate execution if another worker thread or controller process is already publishing
  const lockResult = await prisma.post.updateMany({
    where: {
      id: postId,
      status: { notIn: [POST_STATUS.PUBLISHED, 'PUBLISHING'] },
    },
    data: {
      status: 'PUBLISHING',
    },
  });

  if (lockResult.count === 0) {
    logger.info(`[BullMQ Worker] ⚠️ Post ID ${postId} is already being published or was already published. Skipping duplicate execution.`);
    return { status: 'SKIPPED', reason: 'Already published or publishing in progress' };
  }

  const userAccounts = post.user?.socialAccounts || [];
  const targetPlatforms = post.targetPlatforms.length > 0
    ? post.targetPlatforms
    : [SOCIAL_PLATFORM.INSTAGRAM, SOCIAL_PLATFORM.LINKEDIN, SOCIAL_PLATFORM.X];

  let successCount = 0;
  let failureCount = 0;
  const executionLogs = [];

  for (const platform of targetPlatforms) {
    const account = userAccounts.find((acc) => acc.platform === platform);

    try {
      // Resolve platform-specific caption if post.content is a platform draft JSON map
      let platformCaption = post.content;
      try {
        if (post.content && post.content.trim().startsWith('{')) {
          const parsedDrafts = JSON.parse(post.content);
          if (parsedDrafts[platform]) {
            platformCaption = parsedDrafts[platform];
          } else if (parsedDrafts.content) {
            platformCaption = parsedDrafts.content;
          }
        }
      } catch (e) {
        // Fallback to original post.content string if not JSON
      }

      // Convert any Markdown **bold** or *italic* text into native Unicode characters for LinkedIn/X/Instagram
      platformCaption = convertMarkdownToUnicode(platformCaption);

      // Get valid access token (auto-refreshes if expired)
      const validAccessToken = await getValidAccessToken(post.userId, platform);
      const platformAccountId = account?.platformAccountId || `mock_${platform.toLowerCase()}_user`;

      // Creational + Strategy Design Patterns: Resolve strategy adapter at runtime via Factory
      const adapter = SocialAdapterFactory.getAdapter(platform);
      
      const result = await adapter.publishPost({
        accessToken: validAccessToken,
        platformAccountId,
        caption: platformCaption,
        mediaUrls: post.mediaUrls,
        mediaType: post.mediaType,
      });

      if (result && result.success) {
        successCount++;
        const log = await prisma.socialPostLog.create({
          data: {
            postId: post.id,
            socialAccountId: account?.id || null,
            platform,
            status: SOCIAL_POST_STATUS.SUCCESS,
            externalPostId: result.externalPostId,
            externalPostUrl: result.externalPostUrl,
            publishedAt: new Date(),
          },
        });
        executionLogs.push(log);
      }
    } catch (err) {
      failureCount++;
      logger.error(`[BullMQ Worker] Publishing failed for platform ${platform}: ${err.message}`);
      const log = await prisma.socialPostLog.create({
        data: {
          postId: post.id,
          socialAccountId: account?.id || null,
          platform,
          status: SOCIAL_POST_STATUS.FAILED,
          errorMessage: err.message,
        },
      });
      executionLogs.push(log);
    }
  }

  // Determine final post status
  let finalStatus = POST_STATUS.PUBLISHED;
  if (successCount === 0 && failureCount > 0) {
    finalStatus = POST_STATUS.FAILED;
  } else if (successCount > 0 && failureCount > 0) {
    finalStatus = POST_STATUS.PARTIALLY_PUBLISHED;
  }

  const updatedPost = await prisma.post.update({
    where: { id: post.id },
    data: {
      status: finalStatus,
      publishedAt: new Date(),
    },
  });

  // Emit realtime WebSockets status event & push notification
  socketManager.emitPostStatusChange({
    userId: post.userId,
    postId: post.id,
    status: finalStatus,
    details: { successCount, failureCount },
  });

  const notificationType = finalStatus === POST_STATUS.PUBLISHED
    ? 'success'
    : finalStatus === POST_STATUS.FAILED
      ? 'error'
      : 'warning';

  const notificationTitle = finalStatus === POST_STATUS.PUBLISHED
    ? 'Post Published Successfully 🎉'
    : finalStatus === POST_STATUS.FAILED
      ? 'Post Publishing Failed ⚠️'
      : 'Post Partially Published ⚠️';

  const notificationMessage = finalStatus === POST_STATUS.FAILED
    ? `Publishing failed for ${targetPlatforms.join(', ')}: ${executionLogs.map(l => l.errorMessage).filter(Boolean).join('; ') || 'Platform error'}.`
    : finalStatus === POST_STATUS.PUBLISHED
      ? `Your post was published to ${targetPlatforms.join(', ')} successfully.`
      : `Published on ${successCount} platforms, failed on ${failureCount} platforms.`;

  await NotificationService.createNotification({
    userId: post.userId,
    title: notificationTitle,
    message: notificationMessage,
    type: notificationType,
  });

  // Automatic Local File Storage Cleanup Hook
  if (post.mediaUrls && post.mediaUrls.length > 0) {
    for (const mediaUrl of post.mediaUrls) {
      if (mediaUrl.includes('/uploads/')) {
        try {
          const filename = mediaUrl.split('/uploads/').pop();
          if (filename) {
            const localFilePath = path.join(process.cwd(), 'public/uploads', filename);
            if (fs.existsSync(localFilePath)) {
              await fs.promises.unlink(localFilePath);
              logger.info(`[BullMQ Worker] 🧹 Cleaned up temporary local upload file: ${localFilePath}`);
            }
          }
        } catch (cleanupErr) {
          logger.warn(`[BullMQ Worker] File cleanup warning: ${cleanupErr.message}`);
        }
      }
    }
  }

  // Trigger Rolling Summary Memory Compaction Hook asynchronously (non-blocking)
  if (successCount > 0) {
    updateUserMemory(post.userId, post.content).catch((err) => {
      logger.error(`[BullMQ Worker] Error in memory service hook: ${err.message}`);
    });
  }

  logger.info(`[BullMQ Worker] ✅ Post ID ${post.id} updated to status "${finalStatus}" (${successCount} succeeded, ${failureCount} failed).`);

  return {
    postId: post.id,
    finalStatus,
    successCount,
    failureCount,
    executionLogs,
  };
}

let postWorker = null;

/**
 * Initialize BullMQ Worker instance.
 */
export function initPostWorker() {
  if (postWorker) {
    return postWorker;
  }

  logger.info('[BullMQ Worker] Initializing Post Publishing Worker...');

  postWorker = new Worker(
    POST_QUEUE_NAME,
    async (job) => {
      logger.info(`[BullMQ Worker] Processing Job ID: ${job.id} (Data: ${JSON.stringify(job.data)})`);
      return await processPostPublishing(job.data.postId);
    },
    {
      connection: redisConnectionOptions,
      concurrency: 5, // Concurrent worker processing
    }
  );

  postWorker.on('completed', (job, result) => {
    logger.info(`[BullMQ Worker] 🎉 Job ${job.id} completed successfully! Result:`, result);
  });

  postWorker.on('failed', (job, err) => {
    logger.error(`[BullMQ Worker] ❌ Job ${job?.id} failed with error: ${err.message}`);
  });

  postWorker.on('error', (err) => {
    logger.warn(`[BullMQ Worker Warning] ${err.message}`);
  });

  return postWorker;
}

export default initPostWorker;
