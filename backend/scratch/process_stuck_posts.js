import { PrismaClient } from '@prisma/client';
import { processPostPublishing } from '../src/services/../workers/postWorker.js';

const prisma = new PrismaClient();

async function processStuckPosts() {
  console.log('--- Checking Database for Pending / Stuck Posts ---');
  
  const pendingPosts = await prisma.post.findMany({
    where: {
      status: { in: ['DRAFT', 'SCHEDULED'] }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${pendingPosts.length} pending posts:`);
  for (const post of pendingPosts) {
    console.log(`- Post ID: ${post.id} | Status: ${post.status} | Content: ${post.content.substring(0, 50)}...`);
    console.log(`  Processing post ${post.id} now...`);
    try {
      const res = await processPostPublishing(post.id);
      console.log(`  Result for ${post.id}:`, res?.status || 'DONE');
    } catch (err) {
      console.error(`  Error publishing post ${post.id}:`, err.message);
    }
  }
}

processStuckPosts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
