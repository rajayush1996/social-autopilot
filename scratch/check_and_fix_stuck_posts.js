import { prisma } from '../backend/src/config/db.js';

async function main() {
  console.log('🔍 Checking database for stuck PUBLISHING posts...');
  
  const stuckPosts = await prisma.post.findMany({
    where: {
      status: 'PUBLISHING',
    },
  });

  console.log(`Found ${stuckPosts.length} posts stuck in PUBLISHING status.`);

  for (const post of stuckPosts) {
    console.log(`📌 Post ID: ${post.id} | User ID: ${post.userId} | Content: "${post.content.slice(0, 30)}..." | CreatedAt: ${post.createdAt}`);
  }

  if (stuckPosts.length > 0) {
    const updated = await prisma.post.updateMany({
      where: {
        status: 'PUBLISHING',
      },
      data: {
        status: 'FAILED',
      },
    });
    console.log(`✅ Reset ${updated.count} stuck posts to FAILED status so they can be retried!`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
