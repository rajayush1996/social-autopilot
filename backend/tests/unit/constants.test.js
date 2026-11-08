import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  POST_STATUS,
  SOCIAL_PLATFORM,
  SOCIAL_POST_STATUS,
  AI_TONE,
  QUEUE_CONFIG,
  IMAGE_ASPECT_RATIO,
  IMAGE_DIMENSIONS,
  IMAGE_PROVIDER,
} from '../../src/config/constants.js';

describe('Constants Module Unit Tests', () => {
  it('should export immutable POST_STATUS flags', () => {
    assert.strictEqual(POST_STATUS.DRAFT, 'DRAFT');
    assert.strictEqual(POST_STATUS.SCHEDULED, 'SCHEDULED');
    assert.strictEqual(POST_STATUS.PUBLISHED, 'PUBLISHED');
    assert.strictEqual(POST_STATUS.FAILED, 'FAILED');
    assert.strictEqual(POST_STATUS.CANCELLED, 'CANCELLED');
    assert.ok(Object.isFrozen(POST_STATUS), 'POST_STATUS should be frozen');
  });

  it('should export immutable SOCIAL_PLATFORM flags', () => {
    assert.strictEqual(SOCIAL_PLATFORM.INSTAGRAM, 'INSTAGRAM');
    assert.strictEqual(SOCIAL_PLATFORM.LINKEDIN, 'LINKEDIN');
    assert.strictEqual(SOCIAL_PLATFORM.X, 'X');
    assert.ok(Object.isFrozen(SOCIAL_PLATFORM), 'SOCIAL_PLATFORM should be frozen');
  });

  it('should export immutable QUEUE_CONFIG flags', () => {
    assert.ok(QUEUE_CONFIG.POST_QUEUE_NAME, 'Queue name should be defined');
    assert.ok(QUEUE_CONFIG.PUBLISH_JOB_NAME, 'Job name should be defined');
    assert.ok(Object.isFrozen(QUEUE_CONFIG), 'QUEUE_CONFIG should be frozen');
  });

  it('should export immutable IMAGE_ASPECT_RATIO and IMAGE_DIMENSIONS flags', () => {
    assert.strictEqual(IMAGE_ASPECT_RATIO.SQUARE, '1:1');
    assert.strictEqual(IMAGE_ASPECT_RATIO.LANDSCAPE, '16:9');
    assert.strictEqual(IMAGE_ASPECT_RATIO.PORTRAIT, '4:5');
    assert.ok(Object.isFrozen(IMAGE_ASPECT_RATIO), 'IMAGE_ASPECT_RATIO should be frozen');

    assert.deepStrictEqual(IMAGE_DIMENSIONS[IMAGE_ASPECT_RATIO.SQUARE], { width: 1080, height: 1080, label: 'Square' });
    assert.deepStrictEqual(IMAGE_DIMENSIONS[IMAGE_ASPECT_RATIO.LANDSCAPE], { width: 1200, height: 675, label: 'Landscape' });
    assert.deepStrictEqual(IMAGE_DIMENSIONS[IMAGE_ASPECT_RATIO.PORTRAIT], { width: 1080, height: 1350, label: 'Portrait' });
    assert.ok(Object.isFrozen(IMAGE_DIMENSIONS), 'IMAGE_DIMENSIONS should be frozen');
  });

  it('should export immutable IMAGE_PROVIDER flags', () => {
    assert.strictEqual(IMAGE_PROVIDER.FLUX, 'FLUX_1_SCHNELL');
    assert.strictEqual(IMAGE_PROVIDER.DALLE, 'DALL-E-3');
    assert.strictEqual(IMAGE_PROVIDER.BRANDED_CARD, 'BRANDED_SVG_CARD');
    assert.strictEqual(IMAGE_PROVIDER.HYBRID_SHARP, 'HYBRID_SHARP_COMPOSITE');
    assert.ok(Object.isFrozen(IMAGE_PROVIDER), 'IMAGE_PROVIDER should be frozen');
  });
});
