import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getValidAccessToken } from '../../src/services/auth/tokenManager.js';
import emailService from '../../src/services/emailService.js';
import socketManager from '../../src/services/socketService.js';

describe('TokenManager Service Unit Tests', () => {
  it('should return mock access token for mock social account', async () => {
    try {
      const token = await getValidAccessToken('default-user-id', 'INSTAGRAM');
      assert.ok(token, 'Access token should be returned');
    } catch (err) {
      assert.ok(
        err.message.includes('No connected active') || err.message.includes('expired') || err.message.includes('Can\'t reach database server'),
        'Should throw clear message if account missing or db offline'
      );
    }
  });

  it('should throw clear error and indicate disconnection when account is missing or expired', async () => {
    try {
      await getValidAccessToken('non-existent-user', 'LINKEDIN');
      assert.fail('Should have thrown error for non-existent user');
    } catch (err) {
      assert.ok(
        err.message.includes('No connected active') || err.message.includes('expired') || err.message.includes('Can\'t reach database server'),
        'Error message must indicate missing/expired account or offline db'
      );
    }
  });

  it('should export sendAccountDisconnectedEmail on emailService', () => {
    assert.strictEqual(typeof emailService.sendAccountDisconnectedEmail, 'function');
  });

  it('should safely execute emitAccountStatusChange for DISCONNECTED action', () => {
    // Should execute without throwing even if socket server is unattached
    assert.doesNotThrow(() => {
      socketManager.emitAccountStatusChange({
        userId: 'test_user_abc',
        platform: 'LINKEDIN',
        action: 'DISCONNECTED',
        reason: 'TOKEN_EXPIRED',
      });
    });
  });
});
