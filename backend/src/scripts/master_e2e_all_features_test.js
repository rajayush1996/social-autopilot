import { prisma } from '../config/db.js';
import AuthService from '../services/authService.js';
import UserService from '../services/userService.js';
import PostService from '../services/postService.js';
import { ScheduleService } from '../services/scheduleService.js';
import AnalyticsService from '../services/analyticsService.js';
import { generatePostContent } from '../services/aiService.js';
import { processPostPublishing } from '../workers/postWorker.js';
import NotificationService from '../services/notificationService.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`  ✅ [PASS ${passedTests}]: ${message}`);
}

async function runMasterE2ETestSuite() {
  console.log('\n======================================================================');
  console.log('🚀 RUNNING MASTER COMPREHENSIVE END-TO-END SUITE: ALL FEATURES');
  console.log('======================================================================\n');

  const runId = Date.now();
  const testUserEmail = `master_tester_${runId}@mailinator.com`;
  const testUserPassword = 'TestMasterPassword123!';
  let testUserId = null;
  let testPersonalAccountId = null;
  let testCompanyAccountId = null;
  let testPostId = null;
  let testScheduleId = null;

  try {
    // =========================================================================
    // MODULE 1: AUTHENTICATION & USER MANAGEMENT
    // =========================================================================
    console.log('📦 MODULE 1: Authentication & User Management');

    // 1.1 User Registration
    const registeredUser = await AuthService.register({
      email: testUserEmail,
      password: testUserPassword,
      name: 'Aarav Mehta (Master Tester)',
    });
    assert(registeredUser && registeredUser.id, 'User registered successfully with verification pipeline');
    testUserId = registeredUser.id;

    // Mark email as verified for test user
    await prisma.user.update({
      where: { id: testUserId },
      data: { emailVerified: true },
    });

    // 1.2 User Login
    const loginResult = await AuthService.login({ email: testUserEmail, password: testUserPassword });
    assert(loginResult && loginResult.token, 'User successfully authenticated via login');

    // 1.3 User Profile & Credits
    const userProfile = await UserService.findUserById(testUserId);
    assert(userProfile.email === testUserEmail, 'User profile fetched accurately');
    assert(typeof userProfile.aiCredits === 'number' && userProfile.aiCredits >= 15, 'User initialized with AI generation credits');

    // =========================================================================
    // MODULE 2: FRESH ZERO-STATE DASHBOARD TELEMETRY
    // =========================================================================
    console.log('\n📦 MODULE 2: Zero-State Dashboard & Telemetry');
    const freshDashboard = await AnalyticsService.getDashboardSummary(testUserId);
    
    assert(freshDashboard.stats.totalPublished === 0, 'Fresh user total published posts is exactly 0');
    assert(freshDashboard.stats.totalScheduled === 0, 'Fresh user total scheduled queue is exactly 0');
    assert(freshDashboard.stats.activeChannelsCount === 0, 'Fresh user active connected accounts is exactly 0');
    assert(freshDashboard.stats.allowedChannelsCount === 4, 'Allowed channels count equals 4');
    assert(freshDashboard.sentiment.hasData === false, 'Sentiment analysis hasData is false (zero-state)');
    assert(freshDashboard.heatmap.hasData === false, 'Activity heatmap hasData is false (zero-state)');
    assert(freshDashboard.platformBreakdown.every(p => p.count === 0 && p.percentage === 0), 'All platforms show 0% on fresh zero-state');

    // =========================================================================
    // MODULE 3: SOCIAL ACCOUNTS & MULTI-TARGET CONNECTIONS
    // =========================================================================
    console.log('\n📦 MODULE 3: Social Accounts & Multi-Target Connections');

    // 3.1 Connect Personal Profile
    const personalAccount = await prisma.socialAccount.create({
      data: {
        userId: testUserId,
        platform: 'LINKEDIN',
        platformAccountId: `urn:li:person:aarav_personal_${runId}`,
        username: 'aaravmehta',
        accountName: 'Aarav Mehta (Personal Profile)',
        accountType: 'PERSONAL',
        accessToken: `mock_personal_token_${runId}`,
        isActive: true,
      },
    });
    testPersonalAccountId = personalAccount.id;
    assert(personalAccount.id && personalAccount.accountType === 'PERSONAL', 'Connected LinkedIn Personal Profile');

    // 3.2 Connect Company Page
    const companyAccount = await prisma.socialAccount.create({
      data: {
        userId: testUserId,
        platform: 'LINKEDIN',
        platformAccountId: `urn:li:organization:aarav_corp_${runId}`,
        username: 'nexusautomation',
        accountName: 'Nexus AI Technologies (Company Page)',
        accountType: 'ORGANIZATION',
        accessToken: `mock_company_token_${runId}`,
        isActive: true,
      },
    });
    testCompanyAccountId = companyAccount.id;
    assert(companyAccount.id && companyAccount.accountType === 'ORGANIZATION', 'Connected LinkedIn Business/Company Page');

    // 3.3 Verify Telemetry Updates with Connected Accounts
    const connectedDashboard = await AnalyticsService.getDashboardSummary(testUserId);
    assert(connectedDashboard.stats.activeChannelsCount === 2, 'Telemetry reflects 2 active connected accounts');

    // =========================================================================
    // MODULE 4: AI CONTENT SYNTHESIS & SINGLE-PASS GENERATION
    // =========================================================================
    console.log('\n📦 MODULE 4: AI Content Synthesis');
    const aiDraft = await generatePostContent({
      prompt: 'Announcing our 10x faster autonomous cloud dispatcher',
      targetPlatforms: ['LINKEDIN'],
      tone: 'ENGAGING',
      brandName: 'Nexus AI',
    });
    assert(aiDraft && typeof aiDraft.content === 'string' && aiDraft.content.length > 20, 'AI generated high-quality platform-native post content');

    // =========================================================================
    // MODULE 5: COMPOSER & GRANULAR MULTI-TARGET PUBLISHING
    // =========================================================================
    console.log('\n📦 MODULE 5: Composer & Granular Destination Publishing');

    // 5.1 Create Post targeting BOTH Personal Profile AND Company Page
    const { post: multiTargetPost } = await PostService.createPost({
      userId: testUserId,
      content: '🚀 Nexus AI Dispatcher v2.0 is live! Check out our benchmark tests. #AI #Cloud',
      mediaUrls: [],
      targetPlatforms: ['LINKEDIN'],
      targetAccountIds: [testPersonalAccountId, testCompanyAccountId],
      status: 'DRAFT',
      aiGenerated: true,
      tone: 'ENGAGING',
    });
    testPostId = multiTargetPost.id;
    assert(multiTargetPost.id, 'Created post with multi-destination targets');

    // 5.2 Execute Worker Dispatch
    await processPostPublishing(testPostId);

    // 5.3 Verify Dual Logs (1 for Personal URN + 1 for Company Page URN)
    const postLogs = await prisma.socialPostLog.findMany({ where: { postId: testPostId } });
    assert(postLogs.length === 2, 'Generated exactly 2 distinct dispatch logs for Personal Profile AND Company Page');
    assert(postLogs.some(l => l.socialAccountId === testPersonalAccountId), 'Dispatched to Personal Profile');
    assert(postLogs.some(l => l.socialAccountId === testCompanyAccountId), 'Dispatched to Company Page');

    // =========================================================================
    // MODULE 6: DYNAMIC ANALYTICS & SENTIMENT & HEATMAP ENGINE
    // =========================================================================
    console.log('\n📦 MODULE 6: Dynamic Analytics Engine Calculations');
    
    // Mark post as published to simulate successful completion
    await prisma.post.update({
      where: { id: testPostId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    const activeAnalytics = await AnalyticsService.getDashboardSummary(testUserId);
    assert(activeAnalytics.stats.totalPublished === 1, 'Total published count updated to 1');
    assert(activeAnalytics.sentiment.hasData === true, 'Sentiment analysis hasData is true');
    assert(activeAnalytics.sentiment.positivePct === 100, 'Sentiment analysis calculates 100% positive for ENGAGING post');
    assert(activeAnalytics.heatmap.hasData === true, 'Audience activity heatmap hasData is true');
    
    const linkedinBreakdown = activeAnalytics.platformBreakdown.find(p => p.platform === 'LINKEDIN');
    assert(linkedinBreakdown && linkedinBreakdown.count === 1 && linkedinBreakdown.percentage === 100, 'Platform distribution breakdown accurately reflects 100% LinkedIn');

    // 6.2 Virality Post Diagnosis
    const viralityCheck = await AnalyticsService.diagnosePostVirality({
      content: '🚀 How we scaled from 0 to 100k users in 30 days without spending $1 on ads.',
      platform: 'LINKEDIN',
    });
    assert(viralityCheck.success && typeof viralityCheck.viralityScore === 'number', 'Post Virality Diagnosis returned scores and suggestions');

    // 6.3 Follower Prime-Time Radar
    const peakTimes = await AnalyticsService.getAudiencePeakTimes(testUserId);
    assert(peakTimes.success && peakTimes.activePrimeWindow, 'Audience peak times radar computed successfully');

    // =========================================================================
    // MODULE 7: AUTOPILOT RECURRING SCHEDULES & RECURRING ENGINE
    // =========================================================================
    console.log('\n📦 MODULE 7: Autopilot Recurring Schedules');

    // 7.1 Create Schedule with Granular Destination Target Mapping
    const schedule = await ScheduleService.createSchedule(testUserId, {
      name: 'Daily Nexus Tech Retrospective',
      daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      draftTimeOfDay: '08:00',
      timeOfDay: '19:30',
      timezone: 'Asia/Kolkata',
      repeatType: 'WEEKLY',
      isActive: true,
      targetPlatforms: ['LINKEDIN'],
      targetAccountIds: [testCompanyAccountId],
      tone: 'PROFESSIONAL',
      topicPrompt: 'Deep-dive into event-driven architecture and worker queues',
    });
    testScheduleId = schedule.id;
    assert(schedule.id && schedule.name === 'Daily Nexus Tech Retrospective', 'Autopilot Recurring Schedule created successfully');
    assert(Array.isArray(schedule.targetAccountIds) && schedule.targetAccountIds[0] === testCompanyAccountId, 'Schedule persisted target company page account ID');

    // 7.2 Fetch User Schedules
    const userSchedules = await ScheduleService.getUserSchedules(testUserId);
    assert(userSchedules.length >= 1 && userSchedules[0].targetAccountIds.length === 1, 'Fetched user schedules with granular target IDs');

    // 7.3 Toggle Schedule Active Status
    const toggled = await ScheduleService.toggleScheduleActive(testScheduleId, testUserId, false);
    assert(toggled.isActive === false, 'Toggled schedule active status off');

    // 7.4 Delete Schedule
    await ScheduleService.deleteSchedule(testScheduleId, testUserId);
    const schedulesAfterDelete = await ScheduleService.getUserSchedules(testUserId);
    assert(!schedulesAfterDelete.some(s => s.id === testScheduleId), 'Schedule deleted cleanly from database & cache');

    // =========================================================================
    // MODULE 8: NOTIFICATIONS & AUDIT LOGS
    // =========================================================================
    console.log('\n📦 MODULE 8: Notifications & Audit Pipeline');
    const notification = await NotificationService.createNotification({
      userId: testUserId,
      title: 'Master Test Complete 🎯',
      message: 'All features executed and validated end-to-end.',
      type: 'SUCCESS',
    });
    assert(notification && notification.id, 'Notification created and recorded');

    const notifData = await NotificationService.getUserNotifications(testUserId);
    assert(notifData && Array.isArray(notifData.notifications) && notifData.notifications.length >= 1, 'Retrieved user notifications list and unread count');

    console.log('\n======================================================================');
    console.log(`🎉 MASTER SUITE SUCCESS: ${passedTests}/${totalTests} ALL FEATURE CHECKS PASSED 100%!`);
    console.log('======================================================================\n');

  } finally {
    // Clean up master test data
    console.log('🧹 Cleaning up test artifacts and records...');
    if (testUserId) {
      await prisma.socialPostLog.deleteMany({ where: { socialAccount: { userId: testUserId } } });
      await prisma.post.deleteMany({ where: { userId: testUserId } });
      await prisma.socialAccount.deleteMany({ where: { userId: testUserId } });
      await prisma.automationSchedule.deleteMany({ where: { userId: testUserId } });
      await prisma.notification.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    }
    console.log('✅ Master cleanup complete.');
  }

  process.exit(0);
}

runMasterE2ETestSuite().catch((err) => {
  console.error('💥 Master E2E Suite Failure:', err);
  process.exit(1);
});
