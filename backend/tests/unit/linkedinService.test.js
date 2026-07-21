import { describe, it } from 'node:test';
import assert from 'node:assert';
import LinkedinService from '../../src/services/social/linkedinService.js';

describe('LinkedIn Service Unit Tests', () => {
  it('should publish post in mock/sandbox mode when using mock token', async () => {
    const result = await LinkedinService.publishPost({
      accessToken: 'mock_linkedin_token_789',
      platformAccountId: 'person_li_123',
      caption: 'Testing LinkedIn Service automated post',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.platform, 'LINKEDIN');
    assert.strictEqual(result.isMock, true);
    assert.ok(result.externalPostId.startsWith('urn:li:share:'));
    assert.ok(result.externalPostUrl.includes('linkedin.com/feed/update/'));
  });

  it('should support both getAccessToken and exchangeToken methods', () => {
    assert.strictEqual(typeof LinkedinService.getAccessToken, 'function');
    assert.strictEqual(typeof LinkedinService.exchangeToken, 'function');
  });
});
