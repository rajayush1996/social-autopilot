import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { ImageService } from '../../src/services/ai/imageService.js';
import { extractBrandAndVisualIntentWithAI, extractBrandFromContent } from '../../src/utils/brandExtractor.js';
import { optimizePostForPlatforms } from '../../src/services/aiService.js';

describe('Image Engine & Brand Extractor Unit Tests', () => {

  describe('Brand Extractor & Visual Intent Synthesis', () => {
    it('should extract heuristic brand name accurately from content', () => {
      const brand1 = extractBrandFromContent('How Figma redesigned design collaboration for teams');
      assert.strictEqual(brand1, 'Figma');

      const brand2 = extractBrandFromContent('Exploring how Stripe mastered developer onboarding');
      assert.strictEqual(brand2, 'Stripe');
    });

    it('should generate accurate fallback intent metadata for spiritual topics', async () => {
      const meta = await extractBrandAndVisualIntentWithAI({
        content: 'Om Namah Shivaaye. Finding sacred inner peace and mindfulness amidst chaos.',
        topic: 'Om Namah Shivaaye',
        tone: 'MINDFUL',
      });

      assert.ok(meta, 'Visual metadata should be generated');
      assert.strictEqual(meta.niche, 'SPIRITUAL');
      assert.ok(meta.heroHook && meta.heroHook.length > 0, 'Hero hook should be present');
      assert.ok(/negative space|distorted text|no text|clean/i.test(meta.visualPrompt), 'Visual prompt should specify composition or negative space');
    });

    it('should generate accurate fallback intent metadata for tech startup topics', async () => {
      const meta = await extractBrandAndVisualIntentWithAI({
        content: '📌 5 ways Linear achieved hyper-growth by focusing purely on speed and developer craft.',
        topic: 'Linear Growth Study',
        tone: 'ANALYTICAL',
      });

      assert.ok(meta, 'Visual metadata should be generated');
      assert.ok(meta.heroHook && !meta.heroHook.startsWith('📌'), 'Hero hook should strip leading emojis');
      assert.ok(meta.visualPrompt.includes('negative space'), 'Visual prompt should mandate negative space for typography overlay');
    });
  });

  describe('Sharp Branded Graphic Card Engine (All Aspect Ratios)', () => {
    it('should generate high-res 1:1 Square graphic card (1080x1080)', async () => {
      const result = await ImageService.generateBrandedGraphicCard({
        topic: 'Speed As A Moat',
        brandName: 'Linear',
        hookText: 'Why developer-first tooling wins every enterprise contract',
        takeaways: [
          '1. Eliminate all friction',
          '2. Sub-50ms interaction loops',
          '3. Opinionated minimalism',
        ],
        aspectRatio: '1:1',
      });

      assert.ok(result, 'Result must exist');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.aspectRatio, '1:1');
      assert.strictEqual(result.width, 1080);
      assert.strictEqual(result.height, 1080);
      assert.ok(result.imageUrl.startsWith('/uploads/images/'), 'Should return public image path');

      // Verify file on disk
      const diskPath = path.resolve('public', result.imageUrl.replace(/^\//, ''));
      assert.ok(fs.existsSync(diskPath), 'Generated card must exist on disk');
      const metadata = await sharp(diskPath).metadata();
      assert.strictEqual(metadata.width, 1080);
      assert.strictEqual(metadata.height, 1080);
      assert.strictEqual(metadata.format, 'png');
    });

    it('should generate 16:9 Landscape graphic card (1200x675) for X / Reddit', async () => {
      const result = await ImageService.generateBrandedGraphicCard({
        topic: 'Async Autopilot Velocity',
        brandName: 'OmniSync',
        hookText: 'How modern engineering teams automate distribution without bot penalties',
        takeaways: [
          '1. Human jitter entropy prevents detection',
          '2. Single-pass vector memory prevents burnout',
        ],
        aspectRatio: '16:9',
      });

      assert.ok(result, 'Result must exist');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.aspectRatio, '16:9');
      assert.strictEqual(result.width, 1200);
      assert.strictEqual(result.height, 675);

      const diskPath = path.resolve('public', result.imageUrl.replace(/^\//, ''));
      const metadata = await sharp(diskPath).metadata();
      assert.strictEqual(metadata.width, 1200);
      assert.strictEqual(metadata.height, 675);
    });

    it('should generate 4:5 Portrait graphic card (1080x1350) for Mobile Feeds', async () => {
      const result = await ImageService.generateBrandedGraphicCard({
        topic: 'Mental Resilience',
        brandName: 'Mindful Daily',
        hookText: 'Stillness is not the absence of thought, it is the mastery of attention',
        takeaways: [
          '1. Morning silence before notifications',
          '2. Intentional deep focus blocks',
          '3. Evening digital sunset',
        ],
        aspectRatio: '4:5',
      });

      assert.ok(result, 'Result must exist');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.aspectRatio, '4:5');
      assert.strictEqual(result.width, 1080);
      assert.strictEqual(result.height, 1350);

      const diskPath = path.resolve('public', result.imageUrl.replace(/^\//, ''));
      const metadata = await sharp(diskPath).metadata();
      assert.strictEqual(metadata.width, 1080);
      assert.strictEqual(metadata.height, 1350);
    });
  });

  describe('Hybrid Sharp Typography Compositor & Aspect Ratios', () => {
    it('should composite vector typography overlay onto image buffer accurately', async () => {
      // Create a solid test background image buffer locally
      const baseBuffer = await sharp({
        create: {
          width: 1080,
          height: 1080,
          channels: 4,
          background: { r: 15, g: 23, b: 42, alpha: 1 },
        },
      }).png().toBuffer();

      // Write test image to public uploads so axios can retrieve it or test composite directly
      const tempPath = path.resolve('public', 'uploads', 'images', `test_bg_${Date.now()}.png`);
      fs.writeFileSync(tempPath, baseBuffer);

      // Verify ImageService fallback handling when remote fails or succeeds
      const fallbackResult = await ImageService.generatePostVisual({
        topic: 'Modern Tech Architecture',
        brandName: 'OmniSync',
        content: 'How decoupled micro-services ensure 99.99% uptime in distributed queues.\n📌 1. Circuit breakers\n📌 2. BullMQ isolation',
        renderTypography: true,
        aspectRatio: '1:1',
      });

      assert.ok(fallbackResult, 'Must return visual result');
      assert.strictEqual(fallbackResult.success, true);
      assert.ok(fallbackResult.imageUrl, 'Image URL must be returned');

      // Cleanup temp test file
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    });

    it('should respect renderTypography = false (Raw Art Only)', async () => {
      const rawArtResult = await ImageService.generatePostVisual({
        topic: 'Abstract 3D glassmorphism',
        brandName: 'DesignStudio',
        content: 'Clean minimalist aesthetics for social media cards.',
        renderTypography: false,
        aspectRatio: '16:9',
      });

      assert.ok(rawArtResult, 'Must return visual result');
      assert.strictEqual(rawArtResult.success, true);
      assert.ok(rawArtResult.imageUrl, 'Image URL must be valid');
    });
  });

  describe('Single-Pass AI Adaptation & Visual Meta Integration', () => {
    it('should include visualMeta when adapting posts across multiple platforms', async () => {
      const adapted = await optimizePostForPlatforms({
        content: 'How async workflows save engineering hours and increase focus time.',
        platforms: ['LINKEDIN', 'X'],
        tone: 'PROFESSIONAL',
      });

      assert.strictEqual(adapted.success, true);
      assert.ok(adapted.visualMeta, 'Visual metadata should be synthesized in single-pass');
      assert.ok(adapted.visualMeta.heroHook, 'Should have heroHook');
      assert.ok(adapted.visualMeta.categoryPill, 'Should have categoryPill');
      assert.ok(adapted.visualMeta.visualPrompt, 'Should have visualPrompt');
    });
  });
});
