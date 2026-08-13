import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../config/redis.js';
import { QUEUE_CONFIG } from '../config/constants.js';
import logger from '../utils/logger.js';
import QueueManager from './queueManager.js';

export const POST_QUEUE_NAME = QUEUE_CONFIG.POST_QUEUE_NAME;

import config from '../config/env.js';

let _postQueue = null;

/**
 * BullMQ Queue Instance for Social Media Post Publishing (Lazy Loaded for Redis Mode).
 */
export function getPostQueue() {
  if (!_postQueue && (config.queue?.driver === 'redis')) {
    _postQueue = new Queue(POST_QUEUE_NAME, {
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
  }
  return _postQueue;
}

export const postQueue = {
  add: async (...args) => {
    const q = getPostQueue();
    if (!q) throw new Error('BullMQ queue is disabled in PostgreSQL mode.');
    return q.add(...args);
  },
  getJob: async (...args) => {
    const q = getPostQueue();
    if (!q) return null;
    return q.getJob(...args);
  }
};

/**
 * Enqueue a post publishing job (Dispatches to BullMQ or PostgreSQL based on QUEUE_DRIVER)
 */
export async function enqueuePostJob(params) {
  return QueueManager.enqueuePostJob(params);
}

/**
 * Remove a scheduled post job from queue
 */
export async function removePostJob(postId) {
  return QueueManager.removePostJob(postId);
}

