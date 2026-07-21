import { describe, it } from 'node:test';
import assert from 'node:assert';
import config from '../../src/config/env.js';

describe('Centralized Config Unit Tests', () => {
  it('should load environment configuration object correctly', () => {
    assert.ok(config, 'Config object should be defined');
    assert.strictEqual(typeof config.port, 'number', 'Port should be a number');
    assert.ok(config.social.x.baseUrl, 'X base URL should be defined');
    assert.ok(config.social.instagram.graphBaseUrl, 'Instagram Graph API base URL should be defined');
    assert.ok(config.social.linkedin.apiBaseUrl, 'LinkedIn base URL should be defined');
  });
});
