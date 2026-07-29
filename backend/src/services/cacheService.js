import { getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';
import { TTL } from '../config/cacheKeys.js';

/**
 * Production-Grade Generic Redis Cache Engine (Cache-Aside & Higher-Order Pattern)
 */
export class CacheService {
  /**
   * Fetch cached JSON object from Redis.
   */
  static async get(key) {
    try {
      const redis = getRedisClient();
      if (!redis) return null;

      const cachedData = await redis.get(key);
      if (cachedData) {
        logger.debug(`[RedisCache] ⚡ Cache HIT: ${key}`);
        return JSON.parse(cachedData);
      }
      logger.debug(`[RedisCache] 🧊 Cache MISS: ${key}`);
      return null;
    } catch (err) {
      logger.warn(`[RedisCache Error] GET key "${key}": ${err.message}`);
      return null; // Graceful fallback to DB if Redis fails
    }
  }

  /**
   * Set JSON object in Redis with TTL.
   */
  static async set(key, value, ttlSeconds = TTL.MEDIUM) {
    try {
      const redis = getRedisClient();
      if (!redis) return;

      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await redis.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await redis.set(key, serialized);
      }
      logger.debug(`[RedisCache] 💾 Cached key: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (err) {
      logger.warn(`[RedisCache Error] SET key "${key}": ${err.message}`);
    }
  }

  /**
   * Generic Higher-Order Cache-Aside Helper ("Remember Pattern").
   * Fetches from cache if hit; otherwise executes fallback fetcher, caches result, and returns.
   * 
   * @param {string} key - Cache key
   * @param {number} ttlSeconds - Expiration in seconds
   * @param {Function} fetcherFn - Async function to fetch fresh data on miss
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

  /**
   * Delete single key or wildcard pattern.
   */
  static async del(key) {
    try {
      const redis = getRedisClient();
      if (!redis) return;

      if (key.includes('*')) {
        const keys = await redis.keys(key);
        if (keys.length > 0) {
          await redis.del(...keys);
          logger.debug(`[RedisCache] 🗑️ Deleted ${keys.length} keys matching pattern: ${key}`);
        }
      } else {
        await redis.del(key);
        logger.debug(`[RedisCache] 🗑️ Deleted key: ${key}`);
      }
    } catch (err) {
      logger.warn(`[RedisCache Error] DEL key "${key}": ${err.message}`);
    }
  }

  /**
   * Bulk invalidate multiple patterns/keys.
   */
  static async invalidateMany(keysOrPatterns = []) {
    for (const item of keysOrPatterns) {
      await this.del(item);
    }
  }
}

export default CacheService;
