import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { prisma } from '../config/db.js';
import FeatureConfigService from './featureConfigService.js';
import PostService from './postService.js';
import UserService from './userService.js';
import { generatePostContent } from './aiService.js';
import CampaignMemoryService from './campaignMemoryService.js';
import { enqueuePostJob } from '../queues/postQueue.js';
import { POST_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';
import emailService from './emailService.js';

import CacheService from './cacheService.js';
import { CACHE_KEYS, TTL } from '../config/cacheKeys.js';

export const SCHEDULER_FEATURE_KEY = 'scheduling-dispatcher';

export class ScheduleService {
  /**
   * Check if Scheduling Dispatcher feature is enabled by Admin globally.
   */
  static async isDispatcherEnabledByAdmin() {
    const config = await FeatureConfigService.getFeatureConfig(SCHEDULER_FEATURE_KEY);
    // If config was auto-seeded with isPremium: true, auto-update to false so dispatcher is enabled by default
    if (config && config.isPremium) {
      await FeatureConfigService.setFeatureConfig(SCHEDULER_FEATURE_KEY, false);
      return true;
    }
    return true;
  }

  /**
   * Toggle global Scheduling Dispatcher status (Admin control).
   */
  static async setDispatcherEnabledByAdmin(enabled) {
    // isPremium = false means feature is enabled/active for users
    return FeatureConfigService.setFeatureConfig(SCHEDULER_FEATURE_KEY, !enabled);
  }

  /**
   * Get all automation schedules for a specific user (Cached via CacheService.remember).
   */
  static async getUserSchedules(userId) {
    await UserService.ensureUserExists(userId);
    return CacheService.remember(
      CACHE_KEYS.USER_SCHEDULES(userId),
      TTL.LONG,
      () => prisma.automationSchedule.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })
    );
  }

  /**
   * Get single schedule by ID.
   */
  static async getScheduleById(id, userId) {
    return prisma.automationSchedule.findFirst({
      where: { id, userId },
    });
  }

  /**
   * Create a new automation schedule (Alarm-clock / calendar item).
   */
  static async createSchedule(userId, data) {
    await UserService.ensureUserExists(userId);
    const {
      name,
      daysOfWeek,
      timeOfDay,
      timezone,
      repeatType,
      isActive,
      targetPlatforms,
      tone,
      topicPrompt,
    } = data;

    const result = await prisma.automationSchedule.create({
      data: {
        userId,
        name: name || 'Automated Daily Pulse',
        daysOfWeek: Array.isArray(daysOfWeek) && daysOfWeek.length > 0 
          ? daysOfWeek 
          : ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        timeOfDay: timeOfDay || '09:00',
        timezone: timezone || 'UTC',
        repeatType: repeatType || 'WEEKLY',
        isActive: isActive !== undefined ? !!isActive : true,
        targetPlatforms: Array.isArray(targetPlatforms) && targetPlatforms.length > 0 
          ? targetPlatforms 
          : ['LINKEDIN', 'X'],
        tone: tone || 'ENGAGING',
        topicPrompt: topicPrompt || '',
        campaignMemory: CampaignMemoryService.getDefaultMemory(null, name || 'Automated Daily Pulse'),
      },
    });
    await CacheService.del(CACHE_KEYS.USER_SCHEDULES(userId));
    return result;
  }

  /**
   * Update an existing automation schedule.
   */
  static async updateSchedule(id, userId, data) {
    const existing = await this.getScheduleById(id, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized.');
    }

    const updated = await prisma.automationSchedule.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.daysOfWeek && { daysOfWeek: data.daysOfWeek }),
        ...(data.timeOfDay && { timeOfDay: data.timeOfDay }),
        ...(data.timezone && { timezone: data.timezone }),
        ...(data.repeatType && { repeatType: data.repeatType }),
        ...(data.isActive !== undefined && { isActive: !!data.isActive }),
        ...(data.targetPlatforms && { targetPlatforms: data.targetPlatforms }),
        ...(data.tone && { tone: data.tone }),
        ...(data.topicPrompt !== undefined && { topicPrompt: data.topicPrompt }),
      },
    });
    await CacheService.del(CACHE_KEYS.USER_SCHEDULES(userId));
    await CacheService.del(CACHE_KEYS.CAMPAIGN_MEMORY(id));
    return updated;
  }

  /**
   * Alarm-style quick toggle on/off switch for a schedule.
   */
  static async toggleScheduleActive(id, userId, isActive) {
    const existing = await this.getScheduleById(id, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized.');
    }

    const targetState = isActive !== undefined ? !!isActive : !existing.isActive;

    const toggled = await prisma.automationSchedule.update({
      where: { id },
      data: { isActive: targetState },
    });
    await CacheService.del(CACHE_KEYS.USER_SCHEDULES(userId));
    return toggled;
  }

  /**
   * Delete an automation schedule.
   */
  static async deleteSchedule(id, userId) {
    const existing = await this.getScheduleById(id, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized.');
    }

    const deleted = await prisma.automationSchedule.delete({
      where: { id },
    });
    await CacheService.del(CACHE_KEYS.USER_SCHEDULES(userId));
    await CacheService.del(CACHE_KEYS.CAMPAIGN_MEMORY(id));
    return deleted;
  }

  /**
   * Trigger immediate execution of a single automation schedule.
   * If updateExistingPostId is provided, updates an existing pending queued post instead of creating a duplicate.
   */
  static async runScheduleNow(scheduleId, userId, updateExistingPostId = null) {
    const schedule = await this.getScheduleById(scheduleId, userId);
    if (!schedule) {
      throw new Error('Schedule not found or unauthorized.');
    }

    const user = await UserService.findUserById(userId);
    if (!user) {
      throw new Error('User account not found.');
    }

    if (user.aiCredits <= 0) {
      throw new Error('AI credits exhausted. Please upgrade or top up credits.');
    }

    const context = schedule.topicPrompt || user.brandContext || 'Business growth, tech insights, and audience engagement.';
    
    logger.info(`[ScheduleService] 🚀 Running schedule "${schedule.name}" (${schedule.id}) for user ${userId}...`);

    // Fetch Structured Campaign Memory from Redis Cache (O(1) ~1ms)
    const memoryContract = await CampaignMemoryService.getCampaignMemory(schedule.id, schedule.name);

    // Format memory JSON into clean AI exclusion directives
    const excludedBrands = memoryContract?.aiExclusionRules?.doNotRepeatBrands || [];
    const memorySummaryStr = excludedBrands.length
      ? `EXCLUDED BRANDS (STRICTLY DO NOT REPEAT): ${excludedBrands.join(', ')}`
      : undefined;

    // Generate AI content with Structured Memory Contract
    const aiResult = await generatePostContent({
      prompt: `Schedule: "${schedule.name}". Context: "${context}". Write a compelling, unique social media post.`,
      platform: schedule.targetPlatforms[0] || 'GENERAL',
      tone: schedule.tone || 'ENGAGING',
      brandContext: context,
      contentSummary: memorySummaryStr,
    });

    if (!aiResult || !aiResult.content) {
      throw new Error('Failed to generate AI post content.');
    }

    // Dual-sync update to Campaign Memory (PostgreSQL DB + Redis Cache)
    await CampaignMemoryService.updateCampaignMemory(schedule.id, {
      hookText: aiResult.content.split('\n')[0] || '',
    });

    // Calculate exact target scheduled timestamp using schedule's timeOfDay (e.g. 20:00) and timezone (e.g. Asia/Kolkata)
    const targetScheduledAt = (() => {
      const timeOfDay = schedule.timeOfDay || '09:00';
      const tz = schedule.timezone || 'UTC';
      const [hStr, mStr] = timeOfDay.split(':');
      const targetH = parseInt(hStr, 10) || 0;
      const targetM = parseInt(mStr, 10) || 0;
      const now = new Date();

      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        });
        const parts = formatter.formatToParts(now);
        const partMap = {};
        parts.forEach(p => { partMap[p.type] = p.value; });

        const year = parseInt(partMap.year, 10);
        const month = parseInt(partMap.month, 10) - 1;
        const day = parseInt(partMap.day, 10);

        const guessUtc = new Date(Date.UTC(year, month, day, targetH, targetM, 0));

        const tzCheck = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: false,
        });

        const checkParts = tzCheck.formatToParts(guessUtc);
        const cMap = {};
        checkParts.forEach(p => { cMap[p.type] = p.value; });
        let cH = parseInt(cMap.hour, 10);
        if (cH === 24) cH = 0;
        const cM = parseInt(cMap.minute, 10);
        const cDay = parseInt(cMap.day, 10);

        const guessTotalMin = (cDay * 24 * 60) + (cH * 60) + cM;
        const desiredTotalMin = (day * 24 * 60) + (targetH * 60) + targetM;
        const diffMin = desiredTotalMin - guessTotalMin;

        const finalTarget = new Date(guessUtc.getTime() + diffMin * 60 * 1000);

        if (finalTarget <= now) {
          finalTarget.setDate(finalTarget.getDate() + 1);
        }
        return finalTarget;
      } catch (e) {
        const target = new Date();
        target.setHours(targetH, targetM, 0, 0);
        if (target <= now) target.setDate(target.getDate() + 1);
        return target;
      }
    })();

    let post;
    if (updateExistingPostId) {
      // Update existing pending queued post with new AI content instead of creating a duplicate
      post = await PostService.updatePost(updateExistingPostId, userId, {
        content: aiResult.content,
        targetPlatforms: schedule.targetPlatforms,
        status: POST_STATUS.SCHEDULED,
        scheduledAt: targetScheduledAt,
        aiPrompt: `Scheduled Dispatcher: ${schedule.name} - ${context}`,
      });
      logger.info(`[ScheduleService] Updated existing pending queued post (${post.id}) with new AI draft!`);
    } else {
      // Create post record scheduled for target time
      post = await PostService.createPost({
        userId: user.id,
        content: aiResult.content,
        mediaUrls: [],
        mediaType: null,
        targetPlatforms: schedule.targetPlatforms,
        status: POST_STATUS.SCHEDULED,
        scheduledAt: targetScheduledAt,
        aiGenerated: true,
        aiPrompt: `Scheduled Dispatcher: ${schedule.name} - ${context}`,
      });
    }

    // Queue in BullMQ until exact target scheduledAt time
    await enqueuePostJob({ postId: post.id, scheduledAt: post.scheduledAt });

    // Send Email Approval Notification to User
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
        logger.warn(`[ScheduleService] Email notification warning: ${emailErr.message}`);
      }
    }

    // Decrement user credits
    await UserService.decrementCredits(user.id);

    // Update schedule last run time
    const updatedSchedule = await prisma.automationSchedule.update({
      where: { id: scheduleId },
      data: { lastRunAt: new Date() },
    });

    return {
      schedule: updatedSchedule,
      post,
      generatedText: aiResult.content,
    };
  }

  /**
   * Dispatcher Cron Runner: Evaluates active schedules and runs due schedules.
   */
  static async runDispatcherCycle() {
    const isEnabled = await this.isDispatcherEnabledByAdmin();
    if (!isEnabled) {
      logger.info('[ScheduleService] Scheduling Dispatcher is currently disabled by Admin.');
      return { status: 'DISABLED', processed: 0, reports: [] };
    }

    logger.info('[ScheduleService] ⏰ Checking active automation schedules for dispatch...');

    const activeSchedules = await prisma.automationSchedule.findMany({
      where: {
        isActive: true,
        user: {
          autopilotEnabled: true,
        },
      },
      include: {
        user: true,
      },
    });

    const reports = [];

    for (const sched of activeSchedules) {
      try {
        if (sched.user.aiCredits <= 0) {
          reports.push({ scheduleId: sched.id, name: sched.name, status: 'SKIPPED', reason: 'Insufficient AI credits' });
          continue;
        }

        const runResult = await this.runScheduleNow(sched.id, sched.userId);
        reports.push({
          scheduleId: sched.id,
          name: sched.name,
          userId: sched.userId,
          status: 'SUCCESS',
          postId: runResult.post.id,
        });
      } catch (err) {
        logger.error(`[ScheduleService] Failed schedule run "${sched.id}": ${err.message}`);
        reports.push({
          scheduleId: sched.id,
          name: sched.name,
          userId: sched.userId,
          status: 'FAILED',
          reason: err.message,
        });
      }
    }

    return {
      status: 'EXECUTED',
      processed: activeSchedules.length,
      reports,
    };
  }
}

export default ScheduleService;
