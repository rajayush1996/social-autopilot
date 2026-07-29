import { prisma } from '../backend/src/config/db.js';
import CacheService from '../backend/src/services/cacheService.js';

async function main() {
  const postId = 'c05f8d2b-fa1f-4453-af3b-d899f13d1336';
  console.log(`🔍 Inspecting Post ID: ${postId}`);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: {
        include: {
          socialAccounts: true,
        },
      },
      socialPostLogs: true,
    },
  });

  console.log('--- POST DATA ---');
  console.log('ID:', post?.id);
  console.log('User ID:', post?.userId);
  console.log('Status in DB:', post?.status);
  console.log('Target Platforms:', post?.targetPlatforms);
  console.log('User Connected Accounts:', post?.user?.socialAccounts.map(a => ({ platform: a.platform, username: a.username, active: a.isActive })));
  console.log('--- SOCIAL POST LOGS ---');
  console.log(post?.socialPostLogs);

  // Invalidate Redis RAM Cache for all post queries & patterns
  await CacheService.flushAll();
  console.log('🧹 Flushed all Redis cache so UI gets fresh DB data!');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
