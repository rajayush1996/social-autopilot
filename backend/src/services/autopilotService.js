import UserService from './userService.js';
import PostService from './postService.js';
import FeatureConfigService from './featureConfigService.js';
import { generatePostContent } from './aiService.js';
import { enqueuePostJob } from '../queues/postQueue.js';
import { POST_STATUS } from '../config/constants.js';
import { prisma } from '../config/db.js';
import logger from '../utils/logger.js';

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

        // 5. Create database post record
        const post = await PostService.createPost({
          userId: user.id,
          content: aiResult.content,
          mediaUrls: [],
          mediaType: null,
          targetPlatforms: ['LINKEDIN', 'X'], // Default target channels
          status: POST_STATUS.SCHEDULED,
          scheduledAt: new Date(Date.now() + 5 * 60 * 1000), // Schedule 5 minutes in the future
          aiGenerated: true,
          aiPrompt: `Autopilot daily run context: ${context}`,
        });

        // 6. Enqueue inside BullMQ
        await enqueuePostJob({ postId: post.id, scheduledAt: post.scheduledAt });

        // 7. Decrement user credits
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
