import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../config/redis.js';
import { QUEUE_CONFIG } from '../config/constants.js';
import logger from '../utils/logger.js';

export const POST_QUEUE_NAME = QUEUE_CONFIG.POST_QUEUE_NAME;

/**
 * BullMQ Queue Instance for Social Media Post Publishing.
 */
export const postQueue = new Queue(POST_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Retry after 5s, 10s, 20s if social API fails
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed job logs for 24h
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed job logs for 7 days
    },
  },
});

/**
 * Enqueue a post publishing job into BullMQ.
 * 
 * @param {Object} params
 * @param {string} params.postId - ID of the Post record in database
 * @param {Date|string} params.scheduledAt - Date/time to publish (if delayed)
 * @param {boolean} params.publishNow - True if post should be published immediately
 */
export async function enqueuePostJob({ postId, scheduledAt, publishNow = false }) {
  try {
    const jobId = `post-job-${postId}`;

    if (publishNow) {
      logger.info(`[BullMQ] Enqueueing immediate publish job for Post ID: ${postId}`);
      const job = await postQueue.add(QUEUE_CONFIG.PUBLISH_JOB_NAME, { postId }, { jobId });
      return { success: true, jobId: job.id, delayed: false };
    }

    if (scheduledAt) {
      const scheduledTime = new Date(scheduledAt).getTime();
      const delayMs = Math.max(0, scheduledTime - Date.now());

      logger.info(`[BullMQ] Enqueueing delayed job for Post ID: ${postId} (Delay: ${Math.round(delayMs / 1000)}s)`);
      
      const job = await postQueue.add(
        QUEUE_CONFIG.PUBLISH_JOB_NAME,
        { postId },
        {
          jobId,
          delay: delayMs,
        }
      );

      return { success: true, jobId: job.id, delayed: true, delayMs };
    }

    return { success: false, reason: 'No schedule time or immediate publish flag provided.' };
  } catch (error) {
    logger.error(`[BullMQ] Error enqueueing post job for Post ID ${postId}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Remove a scheduled post job from BullMQ queue (e.g., when post is cancelled).
 */
export async function removePostJob(postId) {
  try {
    const jobId = `post-job-${postId}`;
    const job = await postQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`[BullMQ] Successfully removed job ${jobId} from queue.`);
      return true;
    }
    return false;
  } catch (error) {
    logger.warn(`[BullMQ] Could not remove job for post ${postId}: ${error.message}`);
    return false;
  }
}
