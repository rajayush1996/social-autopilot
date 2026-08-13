import { getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';
import { TTL } from '../config/cacheKeys.js';

// In-Memory RAM Cache Map for Ultra-Fast (0.01ms) Local Caching when Redis is off
const memoryStore = new Map();

/**
 * Multi-Tier High-Performance Cache Service (Redis + In-Memory Fallback)
 */
export class CacheService {
  /**
   * Fetch cached JSON object from Redis (or In-Memory fallback).
   */
  static async get(key) {
    try {
      const redis = getRedisClient();
      if (redis) {
        const cachedData = await redis.get(key);
        if (cachedData) {
          logger.debug(`[RedisCache] ⚡ Cache HIT: ${key}`);
          return JSON.parse(cachedData);
        }
      } else {
        // In-Memory Fallback
        const item = memoryStore.get(key);
        if (item) {
          if (Date.now() < item.expiresAt) {
            logger.debug(`[MemoryCache] ⚡ Cache HIT: ${key}`);
            return item.value;
          }
          memoryStore.delete(key);
        }
      }
      return null;
    } catch (err) {
      logger.warn(`[Cache Error] GET key "${key}": ${err.message}`);
      return null;
    }
  }

  /**
   * Set JSON object in Cache with TTL.
   */
  static async set(key, value, ttlSeconds = TTL.MEDIUM) {
    try {
      const redis = getRedisClient();
      if (redis) {
        const serialized = JSON.stringify(value);
        if (ttlSeconds > 0) {
          await redis.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await redis.set(key, serialized);
        }
        logger.debug(`[RedisCache] 💾 Cached: ${key} (TTL: ${ttlSeconds}s)`);
      } else {
        // In-Memory Fallback
        const ttlMs = (ttlSeconds > 0 ? ttlSeconds : 300) * 1000;
        memoryStore.set(key, {
          value,
          expiresAt: Date.now() + ttlMs,
        });

        // Periodic pruning of expired keys if map grows large
        if (memoryStore.size > 2000) {
          const now = Date.now();
          for (const [k, v] of memoryStore.entries()) {
            if (now >= v.expiresAt) memoryStore.delete(k);
          }
        }
      }
    } catch (err) {
      logger.warn(`[Cache Error] SET key "${key}": ${err.message}`);
    }
  }

  /**
   * Delete specific key or pattern from cache.
   */
  static async del(key) {
    try {
      const redis = getRedisClient();
      if (redis) {
        await redis.del(key);
      }
      memoryStore.delete(key);
    } catch (err) {
      logger.warn(`[Cache Error] DEL key "${key}": ${err.message}`);
    }
  }

  /**
   * Generic Higher-Order Cache-Aside Helper ("Remember Pattern").
   */
  static async remember(key, ttlSeconds, fetcherFn) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const freshData = await fetcherFn();
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttlSeconds);
    }
    return freshData;
  }
}

export default CacheService;
