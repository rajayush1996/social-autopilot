import { describe, it } from 'node:test';
import assert from 'node:assert';
import { POST_STATUS, SOCIAL_PLATFORM, SOCIAL_POST_STATUS, AI_TONE, QUEUE_CONFIG } from '../../src/config/constants.js';

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
});
