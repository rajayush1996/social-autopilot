import { prisma } from '../src/config/db.js';
import SocialAdapterFactory from '../src/services/social/socialAdapterFactory.js';
import { getValidAccessToken } from '../src/services/auth/tokenManager.js';

async function testLiveIgPost() {
  console.log('--- Testing Real Instagram Post Publication ---');
  
  const userAccount = await prisma.socialAccount.findFirst({
    where: { platform: 'INSTAGRAM', isActive: true }
  });

  if (!userAccount) {
    console.error('No connected Instagram account found in DB');
    return;
  }

  console.log(`Connected IG Account: ${userAccount.username} (${userAccount.platformAccountId})`);

  const validToken = await getValidAccessToken(userAccount.userId, 'INSTAGRAM');
  const adapter = SocialAdapterFactory.getAdapter('INSTAGRAM');

  const publicImageUrl = 'https://media.avenar.in/uploads/1785130142119-20240928_105159.jpg';
  console.log(`Publishing post with public image: ${publicImageUrl}...`);

  try {
    const result = await adapter.publishPost({
      accessToken: validToken,
      platformAccountId: userAccount.platformAccountId,
      caption: '🌄 Spiti Valley Biking Adventure! Tested via Social Autopilot Engine 🚀',
      mediaUrls: [publicImageUrl],
      mediaType: 'IMAGE',
    });

    console.log('🎉 PUBLISH SUCCESS RESULT:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ PUBLISH FAILED ERROR:', err.response?.data || err.message);
  }
}

testLiveIgPost()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
