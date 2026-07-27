import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStuckPosts() {
  console.log('--- Inspecting Recent Posts & Statuses ---');
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      socialPostLogs: true
    }
  });

  for (const p of posts) {
    console.log(`Post ID: ${p.id}`);
    console.log(`Status: ${p.status}`);
    console.log(`Created At: ${p.createdAt}`);
    console.log(`Scheduled At: ${p.scheduledAt}`);
    console.log(`Target Platforms: ${p.targetPlatforms}`);
    console.log(`Content: ${p.content.substring(0, 60)}...`);
    console.log(`Media URLs: ${JSON.stringify(p.mediaUrls)}`);
    console.log(`Logs Count: ${p.socialPostLogs.length}`);
    for (const log of p.socialPostLogs) {
      console.log(`  - Log Platform: ${log.platform} | Status: ${log.status} | Error: ${log.errorMessage}`);
    }
    console.log('--------------------------------------------------');
  }
}

checkStuckPosts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
