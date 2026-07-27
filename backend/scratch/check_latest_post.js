import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestPost() {
  console.log('--- Fetching Latest Posts & Error Logs from Database ---');
  const posts = await prisma.post.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      socialPostLogs: true,
    }
  });

  if (posts.length === 0) {
    console.log('No posts found in database.');
    return;
  }

  for (const post of posts) {
    console.log(`\n========================================`);
    console.log(`Post ID: ${post.id}`);
    console.log(`Status: ${post.status}`);
    console.log(`Platforms: ${JSON.stringify(post.targetPlatforms)}`);
    console.log(`Media URLs: ${JSON.stringify(post.mediaUrls)}`);
    console.log(`Content Sample: ${post.content ? post.content.substring(0, 120) : 'N/A'}...`);
    console.log(`Error Log: ${post.errorLog || 'None'}`);
    console.log(`Social Post Logs (${post.socialPostLogs.length}):`);
    for (const log of post.socialPostLogs) {
      console.log(`  - Log ID: ${log.id} | Platform: ${log.platform} | Status: ${log.status}`);
      console.log(`    ErrorMessage: ${log.errorMessage || 'None'}`);
      console.log(`    External Post ID: ${log.externalPostId || 'None'}`);
    }
  }
}

checkLatestPost()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
