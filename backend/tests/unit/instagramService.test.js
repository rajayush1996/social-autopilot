import { describe, it } from 'node:test';
import assert from 'node:assert';
import InstagramService from '../../src/services/social/instagramService.js';

describe('Instagram Service Unit Tests', () => {
  it('should publish post in mock/sandbox mode when using mock token', async () => {
    const result = await InstagramService.publishPost({
      accessToken: 'mock_ig_token_456',
      platformAccountId: 'ig_biz_acc_100',
      caption: 'Testing Instagram Service automated post',
      mediaUrls: ['https://example.com/photo.jpg'],
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.platform, 'INSTAGRAM');
    assert.strictEqual(result.isMock, true);
    assert.ok(result.externalPostId.startsWith('ig_post_'));
    assert.ok(result.externalPostUrl.includes('instagram.com/p/'));
  });

  it('should refresh token in mock mode', async () => {
    const result = await InstagramService.refreshToken('mock_token');
    assert.ok(result.accessToken.startsWith('mock_ig_refreshed_'));
    assert.ok(result.expiresAt instanceof Date);
  });
});
