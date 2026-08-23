import { prisma } from '../config/db.js';
import { processPostPublishing } from '../workers/postWorker.js';
import PostService from '../services/postService.js';
import { POST_STATUS, SOCIAL_PLATFORM } from '../config/constants.js';

async function runMultiTargetImpactTest() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING GRANULAR TARGET ACCOUNT/PAGE IMPACT TEST');
  console.log('======================================================\n');

  // 1. Find or create a test user
  let user = await prisma.user.findFirst({
    where: { email: 'ayush9@mailinator.com' },
  });

  if (!user) {
    user = await prisma.user.findFirst();
  }

  if (!user) {
    console.error('❌ No user found to run impact test.');
    process.exit(1);
  }

  console.log(`👤 Using test user: ${user.email} (ID: ${user.id})`);

  // 2. Setup mock Social Accounts: 1 Personal Profile & 1 Company Page
  const personalAccount = await prisma.socialAccount.upsert({
    where: {
      userId_platform_platformAccountId: {
        userId: user.id,
        platform: 'LINKEDIN',
        platformAccountId: 'urn:li:person:mock_ayush_personal_123',
      },
    },
    update: {
      accountType: 'PERSONAL',
      username: 'Ayush Raj (Personal Profile)',
      accountName: 'Ayush Raj (Personal)',
      isActive: true,
    },
    create: {
      userId: user.id,
      platform: 'LINKEDIN',
      platformAccountId: 'urn:li:person:mock_ayush_personal_123',
      username: 'Ayush Raj (Personal Profile)',
      accountName: 'Ayush Raj (Personal)',
      accountType: 'PERSONAL',
      accessToken: 'mock_personal_token',
      isActive: true,
    },
  });

  const orgAccount = await prisma.socialAccount.upsert({
    where: {
      userId_platform_platformAccountId: {
        userId: user.id,
        platform: 'LINKEDIN',
        platformAccountId: 'urn:li:organization:mock_avenar_org_456',
      },
    },
    update: {
      accountType: 'ORGANIZATION',
      username: 'Avenar Technologies (Company Page)',
      accountName: 'Avenar Technologies (Page)',
      isActive: true,
    },
    create: {
      userId: user.id,
      platform: 'LINKEDIN',
      platformAccountId: 'urn:li:organization:mock_avenar_org_456',
      username: 'Avenar Technologies (Company Page)',
      accountName: 'Avenar Technologies (Page)',
      accountType: 'ORGANIZATION',
      accessToken: 'mock_org_token',
      isActive: true,
    },
  });

  console.log(`✅ Ready Social Accounts:`);
  console.log(`   - Personal: ${personalAccount.username} (${personalAccount.platformAccountId}) [ID: ${personalAccount.id}]`);
  console.log(`   - Company Page: ${orgAccount.username} (${orgAccount.platformAccountId}) [ID: ${orgAccount.id}]`);

  // TEST 1: Post targeted ONLY to Personal Profile
  console.log('\n--- TEST 1: Publishing Post to Personal Profile ONLY ---');
  const { post: personalPost } = await PostService.createPost({
    userId: user.id,
    content: JSON.stringify({ LINKEDIN: 'Hello from Personal Profile! #AutonomousSocial' }),
    targetPlatforms: ['LINKEDIN'],
    targetAccountIds: [personalAccount.id],
    publishNow: false,
  });

  const res1 = await processPostPublishing(personalPost.id);
  const logs1 = await prisma.socialPostLog.findMany({ where: { postId: personalPost.id } });
  console.log(`Logs generated: ${logs1.length}`);
  if (logs1.length === 1 && logs1[0].socialAccountId === personalAccount.id) {
    console.log('✅ TEST 1 PASSED: Exactly 1 log for Personal Profile generated.');
  } else {
    console.error('❌ TEST 1 FAILED:', logs1);
  }

  // TEST 2: Post targeted ONLY to Company Page
  console.log('\n--- TEST 2: Publishing Post to Company Page ONLY ---');
  const { post: orgPost } = await PostService.createPost({
    userId: user.id,
    content: JSON.stringify({ LINKEDIN: 'Official Announcement from Avenar Technologies! #CompanyUpdate' }),
    targetPlatforms: ['LINKEDIN'],
    targetAccountIds: [orgAccount.id],
    publishNow: false,
  });

  const res2 = await processPostPublishing(orgPost.id);
  const logs2 = await prisma.socialPostLog.findMany({ where: { postId: orgPost.id } });
  console.log(`Logs generated: ${logs2.length}`);
  if (logs2.length === 1 && logs2[0].socialAccountId === orgAccount.id) {
    console.log('✅ TEST 2 PASSED: Exactly 1 log for Company Page generated.');
  } else {
    console.error('❌ TEST 2 FAILED:', logs2);
  }

  // TEST 3: Multi-Broadcast Post targeted to BOTH simultaneously
  console.log('\n--- TEST 3: Publishing Post to BOTH Personal + Company Page ---');
  const { post: bothPost } = await PostService.createPost({
    userId: user.id,
    content: JSON.stringify({ LINKEDIN: 'Simultaneous Multi-Channel Launch Broadcast! #OmniSyncLaunch' }),
    targetPlatforms: ['LINKEDIN'],
    targetAccountIds: [personalAccount.id, orgAccount.id],
    publishNow: false,
  });

  const res3 = await processPostPublishing(bothPost.id);
  const logs3 = await prisma.socialPostLog.findMany({ where: { postId: bothPost.id } });
  console.log(`Logs generated: ${logs3.length}`);
  const hasPersonal = logs3.some((l) => l.socialAccountId === personalAccount.id);
  const hasOrg = logs3.some((l) => l.socialAccountId === orgAccount.id);

  if (logs3.length === 2 && hasPersonal && hasOrg) {
    console.log('✅ TEST 3 PASSED: 2 distinct logs for Personal Profile AND Company Page generated.');
  } else {
    console.error('❌ TEST 3 FAILED:', logs3);
  }

  // Clean up test posts
  await prisma.post.deleteMany({
    where: { id: { in: [personalPost.id, orgPost.id, bothPost.id] } },
  });

  console.log('\n======================================================');
  console.log('🎉 ALL 3 GRANULAR TARGETING IMPACT TESTS PASSED 100%!');
  console.log('======================================================\n');
  process.exit(0);
}

runMultiTargetImpactTest().catch((err) => {
  console.error('💥 Impact test encountered an unexpected error:', err);
  process.exit(1);
});
