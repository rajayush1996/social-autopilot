import Redis from 'ioredis';
import logger from '../utils/logger.js';
import config from './env.js';

const redisUrl = config.redis.url;
const redisHost = config.redis.host;
const redisPort = config.redis.port;
const redisPassword = config.redis.password;

const isUpstash = redisHost.includes('upstash.io') || (redisUrl && redisUrl.includes('upstash.io'));

/**
 * BullMQ Connection Options for Redis (Upstash / Local Redis).
 */
export const redisConnectionOptions = redisUrl
  ? {
      url: redisUrl,
      maxRetriesPerRequest: null, // Required by BullMQ
      ...(redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io') ? { tls: { rejectUnauthorized: false } } : {}),
    }
  : {
      host: redisHost,
      port: redisPort,
      ...(redisPassword && { password: redisPassword }),
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      ...(isUpstash ? { tls: { rejectUnauthorized: false } } : {}),
    };

let redisClient = null;

/**
 * Get or create Singleton IORedis connection instance.
 * Returns null if running in Native PostgreSQL mode.
 */
export function getRedisClient() {
  if (config.queue?.driver === 'postgres') {
    return null;
  }

  if (!redisClient) {
    if (config.redis.url) {
      const isTlsUrl = config.redis.url.startsWith('rediss://') || config.redis.url.includes('upstash.io');
      redisClient = new Redis(config.redis.url, {
        maxRetriesPerRequest: null,
        ...(isTlsUrl ? { tls: { rejectUnauthorized: false } } : {}),
      });
    } else {
      redisClient = new Redis(redisConnectionOptions);
    }

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully.');
    });

    redisClient.on('error', (err) => {
      logger.warn(`⚠️ Redis Connection Warning (${err.message}). Ensure REDIS_HOST/REDIS_PASSWORD in .env are valid.`);
    });
  }

  return redisClient;
}

/**
 * Health check helper to verify Redis server connection.
 */
export async function checkRedisConnection() {
  if (config.queue?.driver === 'postgres') {
    logger.info('🛡️ Redis Connection Check Skipped (Running in Native PostgreSQL Mode).');
    return false;
  }

  try {
    const client = getRedisClient();
    if (!client) return false;
    const pong = await client.ping();
    if (pong === 'PONG') {
      logger.info('✅ Redis ping test passed (PONG).');
      return true;
    }
    return false;
  } catch (error) {
    logger.warn(`⚠️ Redis Connection Failed: ${error.message}`);
    logger.warn('💡 Please check REDIS_HOST, REDIS_PORT, REDIS_PASSWORD or REDIS_URL in .env file.');
    return false;
  }
}

export default getRedisClient;

