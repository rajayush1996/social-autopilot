import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import UserService from './userService.js';
import PostService from './postService.js';
import FeatureConfigService from './featureConfigService.js';
import { generatePostContent } from './aiService.js';
import { enqueuePostJob } from '../queues/postQueue.js';
import { POST_STATUS } from '../config/constants.js';
import { prisma } from '../config/db.js';
import logger from '../utils/logger.js';
import emailService from './emailService.js';

function computeTargetScheduledDate(timeOfDayStr = '20:00', timezoneStr = 'Asia/Kolkata') {
  const [hStr, mStr] = (timeOfDayStr || '20:00').split(':');
  const targetHour = parseInt(hStr, 10) || 20;
  const targetMinute = parseInt(mStr, 10) || 0;
  const now = new Date();
  const tzTime = new Date(now.toLocaleString('en-US', { timeZone: timezoneStr || 'Asia/Kolkata' }));
  const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs = tzTime.getTime() - utcTime.getTime();
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezoneStr || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  const getPart = (name) => parts.find(p => p.type === name)?.value;
  const localYear = parseInt(getPart('year'), 10);
  const localMonth = parseInt(getPart('month'), 10) - 1;
  const localDay = parseInt(getPart('day'), 10);
  const localHour = parseInt(getPart('hour'), 10);
  const localMinute = parseInt(getPart('minute'), 10);
  let targetDay = localDay;
  if (localHour > targetHour || (localHour === targetHour && localMinute >= targetMinute)) {
    targetDay += 1;
  }
  const localTargetUtc = new Date(Date.UTC(localYear, localMonth, targetDay, targetHour, targetMinute, 0));
  return new Date(localTargetUtc.getTime() - offsetMs);
}

/**
 * AutopilotService
 * Automates content planning, creation, and queue scheduling based on user contexts.
 */
export class AutopilotService {
  /**
   * Run autopilot daily generation cycle for all qualified users.
   */
  static async runAutopilotCycle() {
    logger.info('[AutopilotService] 🤖 Starting daily social posting autopilot cycle...');
    const users = await UserService.findUsersWithAutopilot();

    const results = [];

    for (const user of users) {
      try {
        // 1. Verify feature access tier (Free vs Premium dynamic settings)
        const allowed = await FeatureConfigService.isFeatureAllowed('autopilot', user.plan);
        if (!allowed) {
          logger.warn(`[AutopilotService] Skipped user "${user.id}": Autopilot feature requires a PREMIUM plan but user plan is "${user.plan}".`);
          results.push({ userId: user.id, status: 'SKIPPED', reason: 'Requires Premium Plan' });
          continue;
        }

        // 2. Check credits
        if (user.aiCredits <= 0) {
          logger.warn(`[AutopilotService] Skipped user "${user.id}": AI credits exhausted.`);
          results.push({ userId: user.id, status: 'SKIPPED', reason: 'Credits exhausted' });
          continue;
        }

        // 3. Check context & query past 30 days posts memory to prevent 1-month repetition loops
        const context = user.brandContext || 'Daily product case studies, startup teardowns, customer problem solving, and business growth insights.';
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentPosts = await prisma.post.findMany({
          where: {
            userId: user.id,
            createdAt: { gte: thirtyDaysAgo },
          },
          orderBy: { createdAt: 'desc' },
          select: { content: true },
        });

        const recentMemory = recentPosts
          .map((p, idx) => `[30-Day Past Post #${idx + 1}]: ${p.content.substring(0, 120)}`)
          .join('\n');

        logger.info(`[AutopilotService] Generating autopilot update for user "${user.id}" with 30-day anti-repetition memory...`);

        // 4. Generate post tailored text with anti-repetition memory engine
        const aiResult = await generatePostContent({
          prompt: `Generate a fresh, unique daily social media post for context: "${context}". Ensure a new story/case study if product teardowns are requested.`,
          platform: 'GENERAL',
          tone: 'ENGAGING',
          brandContext: context,
          contentSummary: recentMemory ? `PAST 30-DAY COVERED DISPATCHES (STRICTLY DO NOT REPEAT):\n${recentMemory}` : undefined,
        });

        if (!aiResult || !aiResult.content) {
          throw new Error('AI content generation returned an empty result.');
        }

        // 5. Determine active connected platforms for user (no hardcoded platforms)
        const userAccounts = await prisma.socialAccount.findMany({
          where: { userId: user.id, isActive: true },
          select: { platform: true },
        });
        const activePlatforms = userAccounts.map((a) => a.platform);

        const userSchedule = await prisma.automationSchedule.findFirst({
          where: { userId: user.id, isActive: true },
        });

        let targetPlatforms = userSchedule?.targetPlatforms || [];
        if (activePlatforms.length > 0) {
          targetPlatforms = targetPlatforms.filter((p) => activePlatforms.includes(p));
          if (targetPlatforms.length === 0) {
            targetPlatforms = activePlatforms;
          }
        }
        if (!targetPlatforms || targetPlatforms.length === 0) {
          targetPlatforms = ['LINKEDIN'];
        }

        // Calculate exact target release time in user's timezone (default Asia/Kolkata or UTC)
        const targetTimeOfDay = userSchedule?.timeOfDay || '20:00';
        const targetTz = userSchedule?.timezone || 'Asia/Kolkata';
        const calculatedScheduledAt = computeTargetScheduledDate(targetTimeOfDay, targetTz);

        // 6. Create database post record
        const post = await PostService.createPost({
          userId: user.id,
          content: aiResult.content,
          mediaUrls: [],
          mediaType: null,
          targetPlatforms: targetPlatforms,
          status: POST_STATUS.SCHEDULED,
          scheduledAt: calculatedScheduledAt,
          aiGenerated: true,
          aiPrompt: `Autopilot daily run context: ${context}`,
        });

        // 6. Enqueue inside BullMQ
        await enqueuePostJob({ postId: post.id, scheduledAt: post.scheduledAt });

        // 7. Send Email Approval Notification strictly for Autopilot runs
        if (user.email) {
          try {
            const approvalToken = jwt.sign(
              { postId: post.id, userId: user.id },
              config.jwt.secret,
              { expiresIn: '7d' }
            );
            await emailService.sendPostApprovalEmail({
              userEmail: user.email,
              userName: user.name,
              postId: post.id,
              postContent: post.content,
              targetPlatforms: post.targetPlatforms,
              scheduledAt: post.scheduledAt,
              approvalToken,
            });
          } catch (emailErr) {
            logger.warn(`[AutopilotService] Email notification warning: ${emailErr.message}`);
          }
        }

        // 8. Decrement user credits
        await UserService.decrementCredits(user.id);

        // 8. Log generation audit trail
        await prisma.aIGenerationLog.create({
          data: {
            userId: user.id,
            prompt: `Autopilot daily run context: ${context}`,
            generatedText: aiResult.content,
            modelUsed: aiResult.modelUsed || 'AutopilotEngine',
            tokensUsed: aiResult.tokensUsed || 0,
          },
        });

        logger.info(`[AutopilotService] Autopilot post created and queued for user "${user.id}" (Post ID: ${post.id}).`);
        results.push({ userId: user.id, status: 'SUCCESS', postId: post.id });
      } catch (err) {
        logger.error(`[AutopilotService] Autopilot failed for user "${user.id}": ${err.message}`);
        results.push({ userId: user.id, status: 'FAILED', reason: err.message });
      }
    }

    return results;
  }
}

export default AutopilotService;
