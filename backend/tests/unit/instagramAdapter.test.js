import test from 'node:test';
import assert from 'node:assert';
import { defaultInstagramAdapter } from '../../src/services/social/instagramService.js';

test('InstagramAdapter Unit Tests', async (t) => {
  await t.test('publishes successfully in sandbox mode', async () => {
    const result = await defaultInstagramAdapter.publishPost({
      accessToken: 'mock_ig_token',
      platformAccountId: 'mock_ig_user',
      caption: '🚀 Testing Instagram Publishing on Social Autopilot!',
      mediaUrls: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'],
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.platform, 'INSTAGRAM');
    assert.strictEqual(result.isMock, true);
    assert.ok(result.externalPostUrl.includes('instagram.com/p/'));
  });
});
