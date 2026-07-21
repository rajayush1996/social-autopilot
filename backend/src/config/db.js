import { PrismaClient } from '@prisma/client';
import config from './env.js';
import logger from '../utils/logger.js';

const globalForPrisma = globalThis;

/**
 * Singleton Prisma Client instance for database operations.
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(config.db.url
      ? {
          datasources: {
            db: {
              url: config.db.url,
            },
          },
        }
      : {}),
    log: config.env === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.env !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Health check helper for database connection.
 */
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ PostgreSQL database connected successfully via Prisma.');
    return true;
  } catch (error) {
    logger.warn(`⚠️ PostgreSQL database connection warning: ${error.message}`);
    logger.warn('💡 Ensure DATABASE_URL in .env is configured correctly.');
    return false;
  }
}

export default prisma;
