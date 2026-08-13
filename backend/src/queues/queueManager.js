import config from '../config/env.js';
import logger from '../utils/logger.js';
import { prisma } from '../config/db.js';
import { POST_STATUS } from '../config/constants.js';
import { processPostPublishing } from '../workers/postWorker.js';

let bullmqPostQueue = null;

// Lazy load BullMQ queue when in Redis mode
async function getBullMQQueue() {
  if (!bullmqPostQueue) {
    const { postQueue } = await import('./postQueue.js');
    bullmqPostQueue = postQueue;
  }
  return bullmqPostQueue;
}

export class QueueManager {
  /**
   * Get currently active Queue Driver ('redis' | 'postgres')
   */
  static getDriver() {
    return (config.queue?.driver || 'redis').toLowerCase();
  }

  /**
   * 🚀 Unified Enqueue Job: Dispatches to BullMQ (Redis) or Native PostgreSQL based on QUEUE_DRIVER
   */
  static async enqueuePostJob({ postId, scheduledAt, publishNow = false }) {
    const driver = this.getDriver();

    // ----------------------------------------------------
    // DRIVER 1: BullMQ + Redis Queue
    // ----------------------------------------------------
    if (driver === 'redis') {
      try {
        const queue = await getBullMQQueue();
        const jobId = `post-job-${postId}`;

        if (publishNow) {
          logger.info(`[QueueManager (Redis)] Enqueueing immediate job for Post: ${postId}`);
          const job = await queue.add('publish-post-job', { postId }, { jobId });
          return { success: true, jobId: job.id, delayed: false, driver: 'redis' };
        }

        if (scheduledAt) {
          const delayMs = Math.max(0, new Date(scheduledAt).getTime() - Date.now());
          logger.info(`[QueueManager (Redis)] Enqueueing delayed job for Post: ${postId} (Delay: ${Math.round(delayMs / 1000)}s)`);
          const job = await queue.add('publish-post-job', { postId }, { jobId, delay: delayMs });
          return { success: true, jobId: job.id, delayed: true, delayMs, driver: 'redis' };
        }
      } catch (redisErr) {
        logger.warn(`[QueueManager (Redis Error)] ${redisErr.message}. Falling back to PostgreSQL native driver.`);
      }
    }

    // ----------------------------------------------------
    // DRIVER 2: PostgreSQL Native Queue & Immediate Dispatcher
    // ----------------------------------------------------
    logger.info(`[QueueManager (PostgreSQL)] Enqueueing job for Post: ${postId} (PublishNow: ${publishNow})`);

    if (publishNow) {
      try {
        const publishResult = await processPostPublishing(postId);
        return { success: true, immediateExecution: true, result: publishResult, driver: 'postgres' };
      } catch (err) {
        logger.error(`[QueueManager (PostgreSQL)] Immediate execution failed for ${postId}: ${err.message}`);
        return { success: false, error: err.message, driver: 'postgres' };
      }
    }

    // Scheduled Post in PostgreSQL: Status is stored in DB, picked up by cron loop
    try {
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: POST_STATUS.SCHEDULED,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        },
      });
    } catch (dbErr) {
      logger.warn(`[QueueManager (PostgreSQL)] Post ${postId} update skipped: ${dbErr.message}`);
    }

    return {
      success: true,
      jobId: `pg-post-${postId}`,
      delayed: true,
      driver: 'postgres',
    };
  }

  /**
   * 🗑️ Remove post job from queue (Redis or PostgreSQL)
   */
  static async removePostJob(postId) {
    const driver = this.getDriver();

    if (driver === 'redis') {
      try {
        const queue = await getBullMQQueue();
        const jobId = `post-job-${postId}`;
        const job = await queue.getJob(jobId);
        if (job) {
          await job.remove();
          logger.info(`[QueueManager (Redis)] Removed job ${jobId} from queue.`);
          return true;
        }
      } catch (e) {
        logger.warn(`[QueueManager (Redis)] Could not remove job: ${e.message}`);
      }
    }

    // PostgreSQL mode: update post status to draft if needed
    try {
      await prisma.post.update({
        where: { id: postId },
        data: { status: POST_STATUS.DRAFT },
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * ⚙️ Initialize Queue Worker based on environment driver
   */
  static async initWorker() {
    const driver = this.getDriver();

    if (driver === 'redis') {
      logger.info('🚀 [QueueManager] Initializing BullMQ + Redis Background Worker...');
      const { initPostWorker } = await import('../workers/postWorker.js');
      return initPostWorker();
    } else {
      logger.info('🛡️ [QueueManager] Running in Native PostgreSQL Queue mode (Zero Redis Polling).');
      return null;
    }
  }
}

export default QueueManager;
