import { getRedisClient } from '../backend/src/config/redis.js';
import { prisma } from '../backend/src/config/db.js';
import SocialAccountService from '../backend/src/services/socialAccountService.js';

async function main() {
  console.log('🧹 Flushing Redis DB completely...');
  const redis = getRedisClient();

  if (redis) {
    await redis.flushdb();
    console.log('✅ Redis DB flushed successfully!');
  } else {
    console.log('⚠️ Redis client not connected or using mock in-memory store.');
  }

  console.log('\n🔍 Checking DB Social Accounts directly via Prisma:');
  const accountsFromDb = await prisma.socialAccount.findMany({});
  for (const acc of accountsFromDb) {
    console.log(`📌 ID: ${acc.id} | Platform: ${acc.platform} | Username: ${acc.username} | isActive: ${acc.isActive} | expiresAt: ${acc.expiresAt}`);
  }

  console.log('\n🔍 Calling SocialAccountService.findActiveAccountsByUserId for ayushraj8571@gmail.com:');
  const user = await prisma.user.findFirst({ where: { email: 'ayushraj8571@gmail.com' } });
  if (user) {
    const activeAccounts = await SocialAccountService.findActiveAccountsByUserId(user.id);
    console.log('Active Accounts returned by Service:', activeAccounts);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
