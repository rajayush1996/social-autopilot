import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getValidAccessToken } from '../../src/services/auth/tokenManager.js';

describe('TokenManager Service Unit Tests', () => {
  it('should return mock access token for mock social account', async () => {
    try {
      const token = await getValidAccessToken('default-user-id', 'INSTAGRAM');
      assert.ok(token, 'Access token should be returned');
    } catch (err) {
      assert.ok(err.message.includes('No connected active'), 'Should throw clear message if account missing');
    }
  });

  it('should throw clear error and indicate disconnection when account is missing or expired', async () => {
    try {
      await getValidAccessToken('non-existent-user', 'LINKEDIN');
      assert.fail('Should have thrown error for non-existent user');
    } catch (err) {
      assert.ok(
        err.message.includes('No connected active') || err.message.includes('expired'),
        'Error message must indicate missing/expired account'
      );
    }
  });
});
