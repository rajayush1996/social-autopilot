import { prisma } from '../config/db.js';
import CacheService from './cacheService.js';
import { CACHE_KEYS, TTL } from '../config/cacheKeys.js';
import logger from '../utils/logger.js';

export class CampaignMemoryService {
  /**
   * Default initial memory structure for a new schedule/campaign
   */
  static getDefaultMemory(campaignId, campaignName) {
    return {
      version: '1.0',
      campaignId,
      campaignName: campaignName || 'Default Campaign',
      totalPostsGenerated: 0,
      lastPublishedAt: null,
      memoryHistory: {
        coveredBrands: [],
        recentHooks: [],
      },
      aiExclusionRules: {
        doNotRepeatBrands: [],
        doNotRepeatAngles: [],
        suggestedNextCategories: ['SaaS', 'FinTech', 'DevTools', 'EdTech', 'Consumer Tech'],
      },
    };
  }

  /**
   * Fetch memory contract from Redis Cache (O(1) ~1ms). Fallback to PostgreSQL DB if Cache Miss.
   */
  static async getCampaignMemory(scheduleId, fallbackName = '') {
    if (!scheduleId) return null;

    return CacheService.remember(
      CACHE_KEYS.CAMPAIGN_MEMORY(scheduleId),
      TTL.WEEK, // 7 Days TTL in Redis
      async () => {
        const schedule = await prisma.automationSchedule.findUnique({
          where: { id: scheduleId },
          select: { id: true, name: true, campaignMemory: true },
        });

        if (schedule?.campaignMemory) {
          return schedule.campaignMemory;
        }

        return this.getDefaultMemory(scheduleId, schedule?.name || fallbackName);
      }
    );
  }

  /**
   * Dual-Sync Update: Append newly published post metadata to PostgreSQL DB & Redis Cache
   */
  static async updateCampaignMemory(scheduleId, { brandName, category, angle, hookText }) {
    if (!scheduleId) return null;

    try {
      const currentMemory = (await this.getCampaignMemory(scheduleId)) || this.getDefaultMemory(scheduleId);

      const coveredBrands = currentMemory.memoryHistory?.coveredBrands || [];
      const doNotRepeatBrands = currentMemory.aiExclusionRules?.doNotRepeatBrands || [];
      const recentHooks = currentMemory.memoryHistory?.recentHooks || [];

      // Append brand if provided and not duplicated
      if (brandName && !doNotRepeatBrands.includes(brandName)) {
        coveredBrands.unshift({
          name: brandName,
          category: category || 'Tech',
          angle: angle || 'Product Growth',
          addedAt: new Date().toISOString(),
        });
        doNotRepeatBrands.unshift(brandName);
      }

      // Append hook text (keep last 10 hooks)
      if (hookText) {
        recentHooks.unshift(hookText.substring(0, 100));
        if (recentHooks.length > 10) recentHooks.pop();
      }

      const updatedMemory = {
        ...currentMemory,
        totalPostsGenerated: (currentMemory.totalPostsGenerated || 0) + 1,
        lastPublishedAt: new Date().toISOString(),
        memoryHistory: {
          coveredBrands: coveredBrands.slice(0, 50),
          recentHooks,
        },
        aiExclusionRules: {
          ...currentMemory.aiExclusionRules,
          doNotRepeatBrands: doNotRepeatBrands.slice(0, 50),
        },
      };

      // 1. Save to PostgreSQL DB
      await prisma.automationSchedule.update({
        where: { id: scheduleId },
        data: { campaignMemory: updatedMemory },
      });

      // 2. Dual-sync update to Redis Cache (7 days TTL)
      await CacheService.set(
        CACHE_KEYS.CAMPAIGN_MEMORY(scheduleId),
        updatedMemory,
        TTL.WEEK
      );

      logger.info(`[CampaignMemoryService] 🧠 Dual-sync memory updated for Schedule ID: ${scheduleId}`);
      return updatedMemory;
    } catch (err) {
      logger.error(`[CampaignMemoryService] Failed to update campaign memory: ${err.message}`);
      return null;
    }
  }
}

export default CampaignMemoryService;
