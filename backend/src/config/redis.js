import Redis from 'ioredis';
import logger from '../utils/logger.js';

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

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
 */
export function getRedisClient() {
  if (!redisClient) {
    if (process.env.REDIS_URL) {
      const isTlsUrl = process.env.REDIS_URL.startsWith('rediss://') || process.env.REDIS_URL.includes('upstash.io');
      redisClient = new Redis(process.env.REDIS_URL, {
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
  try {
    const client = getRedisClient();
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

