import { describe, it } from 'node:test';
import assert from 'node:assert';
import XService from '../../src/services/social/xService.js';

describe('X (Twitter) Service Unit Tests', () => {
  it('should publish post in mock/sandbox mode when using mock token', async () => {
    const result = await XService.publishPost({
      accessToken: 'mock_x_token_123',
      platformAccountId: 'usr_x_999',
      caption: 'Testing X Service automated post',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.platform, 'X');
    assert.strictEqual(result.isMock, true);
    assert.ok(result.externalPostId, 'External post ID should be generated');
    assert.ok(result.externalPostUrl.includes('x.com/'), 'Post URL should point to x.com');
  });

  it('should truncate tweet caption to 280 characters', async () => {
    const longCaption = 'A'.repeat(300);
    const result = await XService.publishPost({
      accessToken: 'mock_token',
      caption: longCaption,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.rawResponse.data.text.length, 280);
    assert.ok(result.rawResponse.data.text.endsWith('...'));
  });

  it('should support both exchangeToken and getAccessToken methods', () => {
    assert.strictEqual(typeof XService.exchangeToken, 'function');
    assert.strictEqual(typeof XService.getAccessToken, 'function');
  });
});
