import test from 'node:test';
import assert from 'node:assert';
import { FacebookAdapter } from '../../src/services/social/facebookService.js';

test('FacebookAdapter Unit Tests', async (t) => {
  const adapter = new FacebookAdapter();

  await t.test('publishes successfully in simulation / mock mode', async () => {
    const result = await adapter.publishPost({
      accessToken: 'mock_fb_token',
      platformAccountId: 'mock_page_123',
      caption: '🚀 Testing Facebook Page Publishing on Social Autopilot!',
      mediaUrls: [],
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.externalPostId.startsWith('fb_mock_post_'));
    assert.ok(result.externalPostUrl.includes('facebook.com/fb_mock_post_'));
  });

  await t.test('generates OAuth URL correctly', async () => {
    const authUrl = await adapter.getAuthUrl({
      redirectUri: 'http://localhost:5000/api/auth/callback/facebook',
      state: 'test_state_123',
    });

    assert.ok(authUrl.includes('facebook.com/v19.0/dialog/oauth'));
    assert.ok(authUrl.includes('state=test_state_123'));
  });
});
