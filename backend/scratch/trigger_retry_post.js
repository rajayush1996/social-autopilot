import { prisma } from '../src/config/db.js';
import { processPostPublishing } from '../src/workers/postWorker.js';

async function testLivePublish() {
  const postId = '63c3cc67-bc14-4a76-99e7-2649ce262664';
  
  console.log(`Resetting Post ${postId} to DRAFT so worker processes it...`);
  await prisma.post.update({
    where: { id: postId },
    data: { status: 'DRAFT' }
  });

  console.log(`Executing processPostPublishing for Post ${postId}...`);
  const result = await processPostPublishing(postId);
  console.log('Result:', JSON.stringify(result, null, 2));
}

testLivePublish()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
