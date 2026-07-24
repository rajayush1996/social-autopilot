import { prisma } from '../config/db.js';
import FeatureConfigService from './featureConfigService.js';
import PostService from './postService.js';
import UserService from './userService.js';
import { generatePostContent } from './aiService.js';
import { enqueuePostJob } from '../queues/postQueue.js';
import { POST_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';

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
   * Get all automation schedules for a specific user.
   */
  static async getUserSchedules(userId) {
    await UserService.ensureUserExists(userId);
    return prisma.automationSchedule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
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

    return prisma.automationSchedule.create({
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
      },
    });
  }

  /**
   * Update an existing automation schedule.
   */
  static async updateSchedule(id, userId, data) {
    const existing = await this.getScheduleById(id, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized.');
    }

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

    return prisma.automationSchedule.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(daysOfWeek !== undefined && { daysOfWeek }),
        ...(timeOfDay !== undefined && { timeOfDay }),
        ...(timezone !== undefined && { timezone }),
        ...(repeatType !== undefined && { repeatType }),
        ...(isActive !== undefined && { isActive: !!isActive }),
        ...(targetPlatforms !== undefined && { targetPlatforms }),
        ...(tone !== undefined && { tone }),
        ...(topicPrompt !== undefined && { topicPrompt }),
      },
    });
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

    return prisma.automationSchedule.update({
      where: { id },
      data: { isActive: targetState },
    });
  }

  /**
   * Delete an automation schedule.
   */
  static async deleteSchedule(id, userId) {
    const existing = await this.getScheduleById(id, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized.');
    }

    return prisma.automationSchedule.delete({
      where: { id },
    });
  }

  /**
   * Trigger immediate execution of a single automation schedule.
   */
  static async runScheduleNow(scheduleId, userId) {
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

    // Generate AI content
    const aiResult = await generatePostContent({
      prompt: `Schedule: "${schedule.name}". Context: "${context}". Write a compelling social media post.`,
      platform: schedule.targetPlatforms[0] || 'GENERAL',
      tone: schedule.tone || 'ENGAGING',
    });

    if (!aiResult || !aiResult.content) {
      throw new Error('Failed to generate AI post content.');
    }

    // Create post record
    const post = await PostService.createPost({
      userId: user.id,
      content: aiResult.content,
      mediaUrls: [],
      mediaType: null,
      targetPlatforms: schedule.targetPlatforms,
      status: POST_STATUS.SCHEDULED,
      scheduledAt: new Date(Date.now() + 2 * 60 * 1000), // 2 mins from now
      aiGenerated: true,
      aiPrompt: `Scheduled Dispatcher: ${schedule.name} - ${context}`,
    });

    // Queue in BullMQ
    await enqueuePostJob({ postId: post.id, scheduledAt: post.scheduledAt });

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
