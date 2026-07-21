import { prisma } from '../config/db.js';
import { enqueuePostJob } from '../queues/postQueue.js';
import { POST_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Synchronize overdue or un-enqueued scheduled posts from DB into BullMQ queue.
 * Useful on server startup or for manual recovery checks.
 */
export async function syncScheduledPostsToQueue() {
  const now = new Date();
  logger.info(`[PostScheduler] 🔄 Syncing scheduled posts with BullMQ at ${now.toISOString()}`);

  try {
    const pendingPosts = await prisma.post.findMany({
      where: {
        status: POST_STATUS.SCHEDULED,
        scheduledAt: {
          lte: now,
        },
      },
      take: 50,
    });

    if (pendingPosts.length === 0) {
      logger.info('[PostScheduler] No pending overdue scheduled posts found in DB.');
      return { syncedCount: 0 };
    }

    logger.info(`[PostScheduler] Found ${pendingPosts.length} overdue post(s). Enqueueing into BullMQ...`);

    for (const post of pendingPosts) {
      await enqueuePostJob({
        postId: post.id,
        publishNow: true,
      });
    }

    return { syncedCount: pendingPosts.length };
  } catch (error) {
    logger.error(`[PostScheduler] Error syncing scheduled posts: ${error.message}`);
    return { error: error.message };
  }
}
