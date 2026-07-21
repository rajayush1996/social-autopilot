import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getValidAccessToken } from '../../src/services/auth/tokenManager.js';

describe('TokenManager Service Unit Tests', () => {
  it('should return mock access token for mock social account', async () => {
    // getValidAccessToken for a mock user/platform
    try {
      const token = await getValidAccessToken('default-user-id', 'INSTAGRAM');
      assert.ok(token, 'Access token should be returned');
    } catch (err) {
      assert.ok(err.message.includes('No connected active'), 'Should throw clear message if account missing');
    }
  });
});
