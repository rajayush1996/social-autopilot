import { prisma } from '../config/db.js';
import { enqueuePostJob } from '../queues/postQueue.js';
import { POST_STATUS } from '../config/constants.js';
import ScheduleService from '../services/scheduleService.js';
import logger from '../utils/logger.js';

/**
 * Synchronize overdue or un-enqueued scheduled posts from DB into BullMQ queue.
 */
export async function syncScheduledPostsToQueue() {
  const now = new Date();

  try {
    const pendingPosts = await prisma.post.findMany({
      where: {
        status: POST_STATUS.SCHEDULED,
        scheduledAt: {
          lte: now,
        },
      },
      take: 50,
    });

    if (pendingPosts.length === 0) {
      return { syncedCount: 0 };
    }

    logger.info(`[PostScheduler] 🚀 Found ${pendingPosts.length} due/overdue post(s). Dispatching to BullMQ...`);

    for (const post of pendingPosts) {
      await enqueuePostJob({
        postId: post.id,
        publishNow: true,
      });
    }

    return { syncedCount: pendingPosts.length };
  } catch (error) {
    logger.error(`[PostScheduler] Error syncing scheduled posts: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Checks active Auto-Pilot Schedules and triggers dispatches if timeOfDay & day matches.
 */
export async function checkAndTriggerAutoPilotSchedules() {
  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeOfDay = `${currentHours}:${currentMinutes}`;
  
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const currentDay = dayNames[now.getDay()];

  try {
    const matchingSchedules = await prisma.automationSchedule.findMany({
      where: {
        isActive: true,
        timeOfDay: currentTimeOfDay,
        daysOfWeek: { has: currentDay },
      },
    });

    for (const sched of matchingSchedules) {
      // Skip if triggered in the last 2 minutes to prevent duplicate runs
      if (sched.lastRunAt && (now.getTime() - new Date(sched.lastRunAt).getTime() < 120000)) {
        continue;
      }

      logger.info(`⏰ [CronScheduler] Executing Auto-Pilot Schedule "${sched.name}" at ${currentTimeOfDay} (${currentDay})...`);
      await ScheduleService.runScheduleNow(sched.id, sched.userId);
    }
  } catch (err) {
    logger.error(`[CronScheduler] Error checking Auto-Pilot schedules: ${err.message}`);
  }
}

/**
 * Self-Healing Recovery: Resets any posts stuck in 'PUBLISHING' status for > 2 minutes to 'FAILED'.
 */
export async function cleanupStuckPublishingPosts() {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  try {
    const stuckPosts = await prisma.post.findMany({
      where: {
        status: POST_STATUS.PUBLISHING,
        updatedAt: {
          lte: twoMinutesAgo,
        },
      },
      select: { id: true, userId: true },
    });

    if (stuckPosts.length > 0) {
      await prisma.post.updateMany({
        where: {
          id: { in: stuckPosts.map(p => p.id) },
        },
        data: {
          status: POST_STATUS.FAILED,
        },
      });

      logger.warn(`[PostScheduler] 🧹 Auto-recovered ${stuckPosts.length} post(s) stuck in PUBLISHING status for > 2 mins -> set to FAILED.`);
    }
  } catch (err) {
    logger.error(`[PostScheduler] Error in stuck posts cleanup: ${err.message}`);
  }
}

/**
 * Starts the 60-second automated Cron Scheduler Loop.
 */
export function startCronSchedulerLoop() {
  logger.info('⏰ [CronScheduler] Starting 60-second automated dispatcher loop...');

  // Run initial check on server boot
  syncScheduledPostsToQueue();
  checkAndTriggerAutoPilotSchedules();
  cleanupStuckPublishingPosts();

  // Polling loop every 60 seconds
  setInterval(async () => {
    try {
      await syncScheduledPostsToQueue();
      await checkAndTriggerAutoPilotSchedules();
      await cleanupStuckPublishingPosts();
    } catch (err) {
      logger.error(`[CronScheduler Error] ${err.message}`);
    }
  }, 60000);
}
