import { test, describe } from 'node:test';
import assert from 'node:assert';
import AnalyticsService from '../../src/services/analyticsService.js';
import DashboardController from '../../src/controllers/dashboardController.js';

describe('⚡ Virality Intelligence & Dashboard Unit Tests', () => {

  // SCENARIO 1: Post Virality Diagnostics
  describe('Scenario 1: Post Virality Diagnostics (Post-Mortem & Hook Score)', () => {
    test('Should analyze post content and return valid virality breakdown', async () => {
      const samplePost = `We launched our new AI tool today. Check it out at https://example.com. It is great.`;
      const result = await AnalyticsService.diagnosePostVirality({
        content: samplePost,
        platform: 'LINKEDIN',
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(typeof result.viralityScore, 'number');
      assert.ok(result.viralityScore >= 0 && result.viralityScore <= 100);
      assert.ok(result.breakdown);
      assert.strictEqual(typeof result.breakdown.hookScore, 'number');
      assert.strictEqual(typeof result.breakdown.readabilityScore, 'number');
      assert.strictEqual(typeof result.breakdown.ctaScore, 'number');
      assert.ok(Array.isArray(result.viralFixes));
      assert.ok(result.viralFixes.length > 0);
      assert.strictEqual(typeof result.improvedViralHook, 'string');
      assert.ok(result.improvedViralHook.length > 5);
    });

    test('Should throw error when empty content is passed for diagnosis', async () => {
      await assert.rejects(
        async () => {
          await AnalyticsService.diagnosePostVirality({ content: '' });
        },
        /Post content is required/
      );
    });
  });

  // SCENARIO 2: Follower Prime-Time Radar (Peak Active Windows)
  describe('Scenario 2: Follower Prime-Time Radar & Peak Slots', () => {
    test('Should return calculated peak slots per platform with confidence scores', async () => {
      const result = await AnalyticsService.getAudiencePeakTimes('test-user-id');
      assert.strictEqual(result.success, true);
      assert.ok(result.slots.LINKEDIN);
      assert.ok(result.slots.X);
      assert.ok(result.slots.INSTAGRAM);
      assert.ok(result.slots.LINKEDIN.length >= 2);
      assert.strictEqual(typeof result.activePrimeWindow.time, 'string');
      assert.strictEqual(typeof result.activePrimeWindow.reachMultiplier, 'string');
    });
  });

  // SCENARIO 3: High-Yield Trending Hashtags
  describe('Scenario 3: Trending Hashtags Radar', () => {
    test('Should return top trending hashtags with reach multiplier and category', async () => {
      const result = await AnalyticsService.getTrendingHashtags();
      assert.strictEqual(result.success, true);
      assert.ok(Array.isArray(result.hashtags));
      assert.ok(result.hashtags.length >= 5);

      const firstTag = result.hashtags[0];
      assert.ok(firstTag.tag.startsWith('#'));
      assert.strictEqual(typeof firstTag.reachMultiplier, 'string');
      assert.strictEqual(typeof firstTag.engagementRate, 'string');
    });
  });

  // SCENARIO 4: Dedicated Dashboard Controller Endpoints
  describe('Scenario 4: Dedicated Dashboard Controller Endpoints', () => {
    test('Heatmap endpoint returns 7-day schedule with 7 time slots', async () => {
      const req = { user: { id: 'test-user' } };
      let responseData = null;
      const res = {
        status: (code) => {
          assert.strictEqual(code, 200);
          return {
            json: (data) => { responseData = data; }
          };
        }
      };
      await DashboardController.getHeatmap(req, res, () => {});
      assert.strictEqual(responseData.success, true);
      assert.strictEqual(responseData.heatmap.length, 7);
      assert.strictEqual(responseData.hours.length, 7);
    });

    test('Format Performance endpoint returns Reels, Carousels, Images, Text breakdown', async () => {
      const req = { user: { id: 'test-user' } };
      let responseData = null;
      const res = {
        status: (code) => {
          assert.strictEqual(code, 200);
          return {
            json: (data) => { responseData = data; }
          };
        }
      };
      await DashboardController.getFormatPerformance(req, res, () => {});
      assert.strictEqual(responseData.success, true);
      assert.strictEqual(responseData.formats.length, 4);
    });

    test('Funnel endpoint returns calculated conversion metrics', async () => {
      const req = { user: { id: 'test-user' } };
      let responseData = null;
      const res = {
        status: (code) => {
          assert.strictEqual(code, 200);
          return {
            json: (data) => { responseData = data; }
          };
        }
      };
      await DashboardController.getFunnel(req, res, () => {});
      assert.strictEqual(responseData.success, true);
      assert.ok(responseData.funnel.totalReach > 0);
      assert.ok(responseData.funnel.leadsCaptured > 0);
    });
  });

  // SCENARIO 5: Timezone Precision (8:00 PM IST -> 14:30 UTC)
  describe('Scenario 5: Timezone Conversion Precision', () => {
    test('Should properly calculate UTC epoch for Asia/Kolkata 20:00 without skewing to 01:30 AM', () => {
      const timeOfDay = '20:00';
      const tz = 'Asia/Kolkata';
      const [hStr, mStr] = timeOfDay.split(':');
      const targetH = parseInt(hStr, 10);
      const targetM = parseInt(mStr, 10);

      const now = new Date('2026-08-13T06:00:00.000Z');
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' });
      const parts = formatter.formatToParts(now);
      const partMap = {};
      parts.forEach(p => { partMap[p.type] = p.value; });

      const year = parseInt(partMap.year, 10);
      const month = parseInt(partMap.month, 10) - 1;
      const day = parseInt(partMap.day, 10);

      const guessUtc = new Date(Date.UTC(year, month, day, targetH, targetM, 0));
      const tzCheck = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
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

      // Verify: 20:00 IST must be 14:30 UTC
      assert.strictEqual(finalTarget.getUTCHours(), 14);
      assert.strictEqual(finalTarget.getUTCMinutes(), 30);
    });
  });

  // SCENARIO 6: Flux AI Image Generation & Prompt Enhancer
  describe('Scenario 6: Flux AI Image Generation & Batch Processor', () => {
    test('Should build enhanced prompt with 3D SaaS theme modifier', async () => {
      const FluxImageService = (await import('../../src/services/fluxImageService.js')).default;
      const enhanced = FluxImageService.buildEnhancedPrompt('New SaaS Dashboard', '3D_SAAS');
      assert.ok(enhanced.includes('isometric 3D render'));
      assert.ok(enhanced.includes('New SaaS Dashboard'));
    });

    test('Should generate single visual asset with valid image URL', async () => {
      const FluxImageService = (await import('../../src/services/fluxImageService.js')).default;
      const result = await FluxImageService.generateSingleImage({
        prompt: 'Cloud analytics dashboard launch',
        themeStyle: '3D_SAAS',
        aspectRatio: '16:9',
      });
      assert.strictEqual(result.success, true);
      assert.ok(result.imageUrl.startsWith('http'));
      assert.ok(result.enhancedPrompt);
    });

    test('Should generate 15-day batch assets with sequential day indexing', async () => {
      const FluxImageService = (await import('../../src/services/fluxImageService.js')).default;
      const result = await FluxImageService.generateBatchImages({
        totalDays: 15,
        themeStyle: 'MINIMAL_LIGHT',
        topicPrompt: 'Founder Tips & Strategies',
      });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.totalDays, 15);
      assert.strictEqual(result.assets.length, 15);
      assert.strictEqual(result.assets[0].day, 1);
      assert.strictEqual(result.assets[14].day, 15);
    });
  });

  // SCENARIO 7: Environment-Based Queue Switcher (Redis BullMQ vs Native PostgreSQL)
  describe('Scenario 7: Environment-Based Queue Driver Switcher', () => {
    test('Should resolve active queue driver based on configuration', async () => {
      const QueueManager = (await import('../../src/queues/queueManager.js')).default;
      const driver = QueueManager.getDriver();
      assert.ok(['redis', 'postgres'].includes(driver));
    });

    test('Should support immediate execution via PostgreSQL driver without Redis connection', async () => {
      const QueueManager = (await import('../../src/queues/queueManager.js')).default;
      const res = await QueueManager.enqueuePostJob({
        postId: 'simulated_post_id_123',
        publishNow: false,
      });
      assert.strictEqual(res.success, true);
    });
  });

  // SCENARIO 8: Multi-Tier Caching (In-Memory RAM + Redis Fallback)
  describe('Scenario 8: Multi-Tier Caching Engine', () => {
    test('Should set and get cached value seamlessly via CacheService', async () => {
      const CacheService = (await import('../../src/services/cacheService.js')).default;
      const testKey = 'user:profile:test_123';
      const testData = { name: 'Ayush', plan: 'ENTERPRISE', credits: 500 };

      await CacheService.set(testKey, testData, 60);
      const cached = await CacheService.get(testKey);

      assert.deepStrictEqual(cached, testData);

      await CacheService.del(testKey);
      const afterDel = await CacheService.get(testKey);
      assert.strictEqual(afterDel, null);
    });

    test('Should execute remember pattern and cache result on miss', async () => {
      const CacheService = (await import('../../src/services/cacheService.js')).default;
      const testKey = 'dashboard:summary:test_456';
      let fetchCount = 0;

      const fetcher = async () => {
        fetchCount++;
        return { totalReach: 15000, viralRate: '4.8%' };
      };

      const result1 = await CacheService.remember(testKey, 60, fetcher);
      assert.strictEqual(result1.totalReach, 15000);
      assert.strictEqual(fetchCount, 1);

      // Second call must hit cache without incrementing fetchCount
      const result2 = await CacheService.remember(testKey, 60, fetcher);
      assert.strictEqual(result2.totalReach, 15000);
      assert.strictEqual(fetchCount, 1);

      await CacheService.del(testKey);
    });

    test('Should support invalidateMany and wildcard pattern deletion', async () => {
      const CacheService = (await import('../../src/services/cacheService.js')).default;
      const key1 = 'app:user:test_user_789:posts:page_1';
      const key2 = 'app:user:test_user_789:posts:page_2';
      const key3 = 'app:post:detail_999';

      await CacheService.set(key1, { data: [1, 2] }, 60);
      await CacheService.set(key2, { data: [3, 4] }, 60);
      await CacheService.set(key3, { id: '999' }, 60);

      assert.ok(await CacheService.get(key1));
      assert.ok(await CacheService.get(key2));
      assert.ok(await CacheService.get(key3));

      // Test invalidateMany with exact key + wildcard pattern
      await CacheService.invalidateMany([key3, 'app:user:test_user_789:posts:*']);

      assert.strictEqual(await CacheService.get(key1), null);
      assert.strictEqual(await CacheService.get(key2), null);
      assert.strictEqual(await CacheService.get(key3), null);
    });
  });
});
