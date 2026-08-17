import axios from 'axios';
import { prisma } from '../config/db.js';
import { enqueuePostJob } from '../queues/postQueue.js';
import { POST_STATUS } from '../config/constants.js';
import ScheduleService from '../services/scheduleService.js';
import logger from '../utils/logger.js';
import { refreshExpiringTokens } from './tokenRefreshJob.js';

import { processPostPublishing } from '../workers/postWorker.js';

/**
 * Synchronize overdue or un-enqueued scheduled posts from DB into BullMQ queue.
 * Automatically falls back to direct publishing if Redis/BullMQ free tier limit is reached.
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

    logger.info(`[PostScheduler] 🚀 Found ${pendingPosts.length} due/overdue post(s). Dispatching...`);

    let successCount = 0;
    for (const post of pendingPosts) {
      const queueRes = await enqueuePostJob({
        postId: post.id,
        publishNow: true,
      });

      // If Redis is full (e.g. Upstash quota exceeded) or unavailable, fallback directly to direct DB publishing
      if (!queueRes || !queueRes.success) {
        logger.warn(`[PostScheduler] Redis Queue full/unavailable. Executing direct PostgreSQL publish fallback for Post: ${post.id}`);
        try {
          await processPostPublishing(post.id);
          successCount++;
        } catch (directErr) {
          logger.error(`[PostScheduler] Direct publish failed for ${post.id}: ${directErr.message}`);
        }
      } else {
        successCount++;
      }
    }

    return { syncedCount: successCount };
  } catch (error) {
    logger.error(`[PostScheduler] Error syncing scheduled posts: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Helper to compute hours, minutes, day of week, and date string in a specific timezone.
 */
function getTimeAndDayInTimezone(date, timezone = 'UTC') {
  try {
    const tz = timezone || 'UTC';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const partMap = {};
    parts.forEach((p) => { partMap[p.type] = p.value; });

    const dayMap = { Sun: 'SUN', Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT' };
    const day = dayMap[partMap.weekday] || 'MON';
    let hours = parseInt(partMap.hour, 10);
    if (hours === 24) hours = 0; // Handle 24:00 edge case in Intl
    const minutes = parseInt(partMap.minute, 10);
    const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;

    return {
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
      day,
      dateStr,
    };
  } catch (e) {
    // Fallback to UTC
    return {
      hours: date.getUTCHours(),
      minutes: date.getUTCMinutes(),
      totalMinutes: date.getUTCHours() * 60 + date.getUTCMinutes(),
      day: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getUTCDay()],
      dateStr: date.toISOString().split('T')[0],
    };
  }
}

/**
 * Checks active Auto-Pilot Schedules and triggers AI Draft Generation & Approval Dispatch at draftTimeOfDay.
 */
export async function checkAndTriggerAutoPilotSchedules() {
  const now = new Date();

  try {
    const activeSchedules = await prisma.automationSchedule.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    for (const sched of activeSchedules) {
      if (!sched.user || sched.user.autopilotEnabled === false) continue;

      const schedTz = sched.timezone || 'Asia/Kolkata';
      const timeInfo = getTimeAndDayInTimezone(now, schedTz);

      // Check if current day in target timezone matches schedule's active days
      if (!sched.daysOfWeek || !sched.daysOfWeek.includes(timeInfo.day)) {
        continue;
      }

      // Parse schedule draft time (e.g. "09:00" -> 9 * 60 = 540 total minutes)
      const [dhStr, dmStr] = (sched.draftTimeOfDay || '09:00').split(':');
      const draftTotalMinutes = (parseInt(dhStr, 10) || 9) * 60 + (parseInt(dmStr, 10) || 0);

      // Check if current time in target timezone is at or past the scheduled draftTimeOfDay
      if (timeInfo.totalMinutes >= draftTotalMinutes) {
        // Check if draft already generated for today's date in target timezone
        const lastDraftDateStr = sched.lastDraftAt ? getTimeAndDayInTimezone(new Date(sched.lastDraftAt), schedTz).dateStr : null;
        if (lastDraftDateStr === timeInfo.dateStr) {
          continue;
        }

        logger.info(`[PostScheduler] 🧠 Generating AutoPilot AI draft for "${sched.name}" (${sched.id}) for user ${sched.userId} (Review window opened at ${sched.draftTimeOfDay || '09:00'} ${schedTz})`);

        try {
          await ScheduleService.runScheduleNow(sched.id, sched.userId);
          
          // Record successful draft generation timestamp
          await prisma.automationSchedule.update({
            where: { id: sched.id },
            data: { lastDraftAt: now },
          });
        } catch (err) {
          logger.error(`[PostScheduler] Error generating draft for schedule ${sched.id}: ${err.message}`);
        }
      }
    }
  } catch (error) {
    logger.error(`[PostScheduler] Error checking autopilot schedules: ${error.message}`);
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
 * Automated Jugaad: Self-Pinging Keep-Alive Worker
 * Keeps Render/Railway free-tier servers awake 24/7 by pinging its own external URL.
 */
export function startSelfKeepAlivePinger() {
  const targetUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || process.env.BACKEND_URL;
  if (!targetUrl) {
    logger.info('[SelfKeepAlive] No RENDER_EXTERNAL_URL / APP_URL set in env. Skipping external self-pinger.');
    return;
  }

  const pingUrl = targetUrl.endsWith('/health') ? targetUrl : `${targetUrl.replace(/\/$/, '')}/health`;
  logger.info(`🛰️ [SelfKeepAlive] Initializing 8-minute self-keep-alive pinger for: ${pingUrl}`);

  // Ping every 8 minutes (Render sleeps after 15 mins)
  setInterval(async () => {
    try {
      const res = await axios.get(pingUrl, { timeout: 15000 });
      logger.info(`🛰️ [SelfKeepAlive] Self-ping successful! HTTP Status: ${res.status}`);
    } catch (err) {
      logger.warn(`🛰️ [SelfKeepAlive Warning] Ping failed: ${err.message}`);
    }
  }, 8 * 60 * 1000);
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
  refreshExpiringTokens();
  startSelfKeepAlivePinger();

  // Polling loop every 60 seconds for posts/schedules
  setInterval(async () => {
    try {
      await syncScheduledPostsToQueue();
      await checkAndTriggerAutoPilotSchedules();
      await cleanupStuckPublishingPosts();
    } catch (err) {
      logger.error(`[CronScheduler Error] ${err.message}`);
    }
  }, 60000);

  // Proactive token refresh loop every 12 hours (scans and refreshes tokens expiring within 7 days)
  setInterval(async () => {
    try {
      await refreshExpiringTokens();
    } catch (err) {
      logger.error(`[CronScheduler TokenRefresh Error] ${err.message}`);
    }
  }, 12 * 60 * 60 * 1000);
}
