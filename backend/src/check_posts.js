import { prisma } from './config/db.js';

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'ayushraj709@gmail.com' }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log(`User found: ${user.name} (${user.id})`);

  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      postLogs: true
    }
  });

  console.log('\n--- Recent Posts for ayushraj709@gmail.com ---');
  posts.forEach((p, idx) => {
    console.log(`\n[${idx + 1}] ID: ${p.id}`);
    console.log(`    Status: ${p.status}`);
    console.log(`    Platforms: ${p.targetPlatforms.join(', ')}`);
    console.log(`    ScheduledAt / CreatedAt: ${p.scheduledAt || p.createdAt}`);
    console.log(`    Content Snippet: ${p.content.slice(0, 100).replace(/\n/g, ' ')}...`);
    console.log(`    First Comment: ${p.firstComment || 'None (AI Smart Comment)'}`);
    console.log(`    Post Logs: ${p.postLogs.length} logs`);
    p.postLogs.forEach(l => {
      console.log(`      - Platform: ${l.platform} | Status: ${l.status} | ExtID: ${l.externalPostId || 'N/A'}`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
