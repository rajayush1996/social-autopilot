import { prisma } from '../backend/src/config/db.js';
import { decrypt } from '../backend/src/utils/encryption.js';

async function main() {
  console.log('🔍 Inspecting all Social Accounts in DB...');

  const accounts = await prisma.socialAccount.findMany({
    include: {
      user: true,
    },
  });

  for (const acc of accounts) {
    let decAccessToken = 'N/A';
    try {
      decAccessToken = decrypt(acc.accessToken);
    } catch (e) {
      decAccessToken = acc.accessToken;
    }

    console.log(`📌 Account ID: ${acc.id}`);
    console.log(`   User: ${acc.user?.email || acc.userId}`);
    console.log(`   Platform: ${acc.platform}`);
    console.log(`   Username: ${acc.username}`);
    console.log(`   isActive: ${acc.isActive}`);
    console.log(`   expiresAt: ${acc.expiresAt}`);
    console.log(`   Decrypted AccessToken: ${decAccessToken.slice(0, 25)}...`);
    console.log('---');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
