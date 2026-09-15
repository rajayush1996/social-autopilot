import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import FeatureConfigService from '../../src/services/featureConfigService.js';
import AuthService from '../../src/services/authService.js';

describe('Platform Permissions & Super Admin Controls Unit Tests', () => {
  it('should retrieve default Platform Status Matrix with ENABLED, COMING_SOON, and DISABLED states', async () => {
    const matrix = await FeatureConfigService.getPlatformStatusMatrix();
    assert.ok(matrix, 'Platform status matrix should exist');
    assert.equal(matrix.LINKEDIN, 'ENABLED');
    assert.equal(typeof matrix.INSTAGRAM, 'string');
    assert.equal(typeof matrix.FACEBOOK, 'string');
  });

  it('should retrieve Plan Features Matrix with default tier configs', async () => {
    const planMatrix = await FeatureConfigService.getPlanFeaturesMatrix();
    assert.ok(planMatrix.FREE, 'FREE plan should exist in matrix');
    assert.ok(planMatrix.PRO, 'PRO plan should exist in matrix');
    assert.ok(planMatrix.ENTERPRISE, 'ENTERPRISE plan should exist in matrix');
    assert.ok(Array.isArray(planMatrix.FREE.allowedPlatforms), 'FREE plan should have allowedPlatforms array');
  });

  it('should reject getOAuthUrl when platform is unsupported or disabled', async () => {
    await assert.rejects(
      async () => {
        await AuthService.getOAuthUrl({ platform: 'UNSUPPORTED_XYZ', userIdInput: 'test-user-id' });
      },
      (err) => {
        assert.ok(err.message.includes('Unsupported platform') || err.message.includes('disabled'));
        return true;
      }
    );
  });
});
