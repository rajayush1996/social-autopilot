import { prisma } from '../config/db.js';
import AnalyticsService from '../services/analyticsService.js';
import PostService from '../services/postService.js';
import { ScheduleService } from '../services/scheduleService.js';
import { processPostPublishing } from '../workers/postWorker.js';

async function runFullLifecycleE2ETest() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING COMPREHENSIVE END-TO-END ZERO-STATE & DYNAMIC TELEMETRY TEST');
  console.log('======================================================\n');

  // 1. Create a brand new isolated test user (Fresh New User Lifecycle)
  const testEmail = `newcreator_${Date.now()}@mailinator.com`;
  const newUser = await prisma.user.create({
    data: {
      email: testEmail,
      name: 'Priya Sharma (New Creator)',
      password: 'MockSecurePassword123!',
      aiCredits: 20,
      plan: 'FREE',
      role: 'USER',
    },
  });

  console.log(`👤 STEP 1: Created Fresh New User: ${newUser.email} (ID: ${newUser.id})`);

  try {
    // 2. Verify Fresh Zero-State Telemetry on Brand New User
    console.log('\n--- VERIFYING ZERO-STATE DASHBOARD TELEMETRY ---');
    const freshSummary = await AnalyticsService.getDashboardSummary(newUser.id);
    
    console.log('📊 Fresh Telemetry Response:', {
      totalPublished: freshSummary.stats.totalPublished,
      totalScheduled: freshSummary.stats.totalScheduled,
      activeChannelsCount: freshSummary.stats.activeChannelsCount,
      allowedChannelsCount: freshSummary.stats.allowedChannelsCount,
      sentimentHasData: freshSummary.sentiment.hasData,
      heatmapHasData: freshSummary.heatmap.hasData,
    });

    if (freshSummary.stats.totalPublished !== 0) throw new Error('Expected totalPublished to be 0 for fresh user');
    if (freshSummary.stats.activeChannelsCount !== 0) throw new Error('Expected activeChannelsCount to be 0 for fresh user');
    if (freshSummary.stats.allowedChannelsCount !== 4) throw new Error('Expected allowedChannelsCount to be 4 (allowedPlatforms length)');
    if (freshSummary.sentiment.hasData !== false) throw new Error('Expected sentiment.hasData to be false for fresh user');
    if (freshSummary.heatmap.hasData !== false) throw new Error('Expected heatmap.hasData to be false for fresh user');
    console.log('✅ ZERO-STATE VERIFIED: Fresh user has 0 fake stats, clean zero metrics, and no hardcoded fallbacks!');

    // 3. Connect Channels (Personal Profile + Company Page)
    console.log('\n--- STEP 2: CONNECTING SOCIAL CHANNELS ---');
    const personalAccount = await prisma.socialAccount.create({
      data: {
        userId: newUser.id,
        platform: 'LINKEDIN',
        platformAccountId: `urn:li:person:priya_${Date.now()}`,
        username: 'priyasharma',
        accountName: 'Priya Sharma (Personal Profile)',
        accountType: 'PERSONAL',
        accessToken: 'mock_token_priya_personal',
        isActive: true,
      },
    });

    const companyAccount = await prisma.socialAccount.create({
      data: {
        userId: newUser.id,
        platform: 'LINKEDIN',
        platformAccountId: `urn:li:organization:innova_${Date.now()}`,
        username: 'innovatech',
        accountName: 'InnovaTech AI (Company Page)',
        accountType: 'ORGANIZATION',
        accessToken: 'mock_token_innova_org',
        isActive: true,
      },
    });

    console.log(`✅ Linked Accounts:\n   - Personal: ${personalAccount.accountName} [ID: ${personalAccount.id}]\n   - Company: ${companyAccount.accountName} [ID: ${companyAccount.id}]`);

    // Verify Active Channels Count in Telemetry
    const connectedSummary = await AnalyticsService.getDashboardSummary(newUser.id);
    console.log(`📊 Connected Accounts Metric: ${connectedSummary.stats.activeChannelsCount} active / ${connectedSummary.stats.allowedChannelsCount} allowed`);
    if (connectedSummary.stats.activeChannelsCount !== 2) throw new Error('Expected 2 active channels after connecting');

    // 4. Create and Dispatch a Multi-Target Post (Both Personal + Company)
    console.log('\n--- STEP 3: PUBLISHING GRANULAR MULTI-TARGET POST ---');
    const { post } = await PostService.createPost({
      userId: newUser.id,
      content: '🚀 Scaling our AI infra to 1M daily requests! Excited to share our roadmap. #SaaS #AI',
      mediaUrls: [],
      targetPlatforms: ['LINKEDIN'],
      targetAccountIds: [personalAccount.id, companyAccount.id],
      status: 'DRAFT',
      aiGenerated: false,
      tone: 'ENGAGING',
    });

    // Execute Worker Job
    await processPostPublishing(post.id);

    // Verify logs
    const logs = await prisma.socialPostLog.findMany({ where: { postId: post.id } });
    console.log(`✅ Multi-Target Dispatches Generated: ${logs.length} logs`);
    if (logs.length !== 2) throw new Error(`Expected 2 logs for Personal + Company Page dispatches, got ${logs.length}`);

    // 5. Verify Dynamic Analytics Engine Updates with Real Data
    console.log('\n--- STEP 4: VERIFYING DYNAMIC ANALYTICS CALCULATIONS ---');
    // Mark post as published for analytics calculation test
    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    const activeSummary = await AnalyticsService.getDashboardSummary(newUser.id);
    console.log('📊 Active Telemetry Response:', {
      totalPublished: activeSummary.stats.totalPublished,
      sentiment: activeSummary.sentiment,
      platformBreakdown: activeSummary.platformBreakdown,
      heatmapHasData: activeSummary.heatmap.hasData,
    });

    if (activeSummary.stats.totalPublished !== 1) throw new Error('Expected totalPublished to be 1');
    if (activeSummary.sentiment.hasData !== true) throw new Error('Expected sentiment.hasData to be true after publishing');
    if (activeSummary.sentiment.positivePct !== 100) throw new Error('Expected 100% positive sentiment for ENGAGING tone');
    if (activeSummary.heatmap.hasData !== true) throw new Error('Expected heatmap.hasData to be true after publishing');

    const linkedinStat = activeSummary.platformBreakdown.find(p => p.platform === 'LINKEDIN');
    if (!linkedinStat || linkedinStat.count !== 1 || linkedinStat.percentage !== 100) {
      throw new Error('Expected LinkedIn platform breakdown to be 1 count (100%)');
    }
    console.log('✅ DYNAMIC CALCULATIONS VERIFIED: Real post data seamlessly reflected in all graphs and metrics!');

    // 6. Test Autopilot Schedule with Granular Target Account Mapping
    console.log('\n--- STEP 5: TESTING AUTOPILOT RECURRING SCHEDULE WITH TARGET MAPPING ---');
    const schedule = await ScheduleService.createSchedule(newUser.id, {
      name: 'Priya Morning AI Insights',
      daysOfWeek: ['MON', 'WED', 'FRI'],
      draftTimeOfDay: '08:30',
      timeOfDay: '18:00',
      timezone: 'Asia/Kolkata',
      repeatType: 'WEEKLY',
      isActive: true,
      targetPlatforms: ['LINKEDIN'],
      targetAccountIds: [companyAccount.id], // Specific company page targeting
      tone: 'PROFESSIONAL',
      topicPrompt: 'Weekly architectural retrospective on distributed vector search',
    });

    console.log(`✅ Schedule Created with Target Account IDs:`, schedule.targetAccountIds);
    if (!schedule.targetAccountIds || schedule.targetAccountIds.length !== 1 || schedule.targetAccountIds[0] !== companyAccount.id) {
      throw new Error('Schedule failed to persist granular targetAccountIds');
    }

    console.log('\n======================================================');
    console.log('🎉 ALL END-TO-END TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');

  } finally {
    // Cleanup test data
    console.log('🧹 Cleaning up test user and records...');
    await prisma.socialPostLog.deleteMany({ where: { socialAccount: { userId: newUser.id } } });
    await prisma.post.deleteMany({ where: { userId: newUser.id } });
    await prisma.socialAccount.deleteMany({ where: { userId: newUser.id } });
    await prisma.automationSchedule.deleteMany({ where: { userId: newUser.id } });
    await prisma.user.delete({ where: { id: newUser.id } });
    console.log('✅ Cleanup complete.');
  }

  process.exit(0);
}

runFullLifecycleE2ETest().catch((err) => {
  console.error('💥 E2E Test Failure:', err);
  process.exit(1);
});
