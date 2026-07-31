import { prisma } from '../backend/src/config/db.js';
import CacheService from '../backend/src/services/cacheService.js';
import { CACHE_KEYS } from '../backend/src/config/cacheKeys.js';

async function main() {
  console.log('🔄 Deactivating invalid LinkedIn account for testing...');

  const updated = await prisma.socialAccount.updateMany({
    where: {
      platform: 'LINKEDIN',
    },
    data: {
      isActive: false,
    },
  });

  console.log(`Updated ${updated.count} LinkedIn account(s) to isActive: false.`);

  await CacheService.flushAll();
  console.log('🧹 Flushed all Redis cache!');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
