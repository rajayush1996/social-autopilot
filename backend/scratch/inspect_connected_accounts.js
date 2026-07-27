import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectConnectedAccounts() {
  console.log('--- Inspecting Connected Social Accounts in Database ---');
  const accounts = await prisma.socialAccount.findMany({});

  for (const acc of accounts) {
    console.log(`Account ID: ${acc.id}`);
    console.log(`Platform: ${acc.platform}`);
    console.log(`Platform Account ID: ${acc.platformAccountId}`);
    console.log(`Username: ${acc.platformUsername || acc.username}`);
    console.log(`Access Token Sample: ${acc.accessToken ? acc.accessToken.substring(0, 25) : 'N/A'}...`);
    console.log(`Is Connected: ${acc.isConnected}`);
    console.log(`User ID: ${acc.userId}`);
    console.log('--------------------------------------------------');
  }

  console.log('\n--- Inspecting All Posts & SocialPostLogs ---');
  const logs = await prisma.socialPostLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { post: true }
  });

  for (const log of logs) {
    console.log(`Log ID: ${log.id} | Status: ${log.status} | Platform: ${log.platform}`);
    console.log(`External Post ID: ${log.externalPostId}`);
    console.log(`Error Message: ${log.errorMessage}`);
    console.log(`Post Media URLs: ${JSON.stringify(log.post.mediaUrls)}`);
    console.log('--------------------------------------------------');
  }
}

inspectConnectedAccounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
