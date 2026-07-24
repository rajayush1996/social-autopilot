import { Worker } from 'bullmq';
import { POST_QUEUE_NAME } from '../queues/postQueue.js';
import { redisConnectionOptions } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { POST_STATUS, SOCIAL_PLATFORM, SOCIAL_POST_STATUS } from '../config/constants.js';
import SocialAdapterFactory from '../services/social/socialAdapterFactory.js';
import { getValidAccessToken } from '../services/auth/tokenManager.js';
import socketManager from '../services/socketService.js';
import logger from '../utils/logger.js';

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

  socketManager.emitNotification({
    userId: post.userId,
    title: 'Post Dispatch Status',
    message: `Post ${post.id.slice(0, 8)} updated to ${finalStatus}`,
    type: finalStatus === POST_STATUS.PUBLISHED ? 'success' : 'info',
  });

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
