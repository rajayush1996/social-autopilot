import { describe, it } from 'node:test';
import assert from 'node:assert';
import SocialAdapterFactory from '../../src/services/social/socialAdapterFactory.js';
import { InstagramAdapter } from '../../src/services/social/instagramService.js';
import { LinkedinAdapter } from '../../src/services/social/linkedinService.js';
import { XAdapter } from '../../src/services/social/xService.js';
import { FacebookAdapter } from '../../src/services/social/facebookService.js';

describe('SocialAdapterFactory Creational Pattern Unit Tests', () => {
  it('should resolve correct platform adapter instances', () => {
    const instagramAdapter = SocialAdapterFactory.getAdapter('INSTAGRAM');
    const linkedinAdapter = SocialAdapterFactory.getAdapter('LINKEDIN');
    const xAdapter = SocialAdapterFactory.getAdapter('X');
    const twitterAdapter = SocialAdapterFactory.getAdapter('TWITTER');
    const facebookAdapter = SocialAdapterFactory.getAdapter('FACEBOOK');

    assert.ok(instagramAdapter instanceof InstagramAdapter, 'Should instantiate InstagramAdapter');
    assert.ok(linkedinAdapter instanceof LinkedinAdapter, 'Should instantiate LinkedinAdapter');
    assert.ok(xAdapter instanceof XAdapter, 'Should instantiate XAdapter');
    assert.ok(twitterAdapter instanceof XAdapter, 'TWITTER should resolve to XAdapter');
    assert.ok(facebookAdapter instanceof FacebookAdapter, 'Should instantiate FacebookAdapter');
  });

  it('should throw error for unsupported platform strategy', () => {
    assert.throws(() => {
      SocialAdapterFactory.getAdapter('TIKTOK');
    }, /Unsupported platform adapter strategy/);
  });
});
