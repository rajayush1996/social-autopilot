import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ResilientUploader } from '../../src/services/upload/resilientUploader.js';
import LocalSimulationUploadStrategy from '../../src/services/upload/simulationStrategy.js';
import CloudinaryUploadStrategy from '../../src/services/upload/cloudinaryStrategy.js';
import R2UploadStrategy from '../../src/services/upload/r2Strategy.js';
import UploadStrategyFactory from '../../src/services/upload/uploadStrategyFactory.js';

describe('Resilient Upload Strategy Pattern Unit Tests', () => {
  it('should instantiate Cloudflare R2 strategy via UploadStrategyFactory', () => {
    const strategy = UploadStrategyFactory.getStrategy('r2');
    assert.strictEqual(strategy.name, 'CloudflareR2');
    assert.strictEqual(strategy.isConfigured(), true);
  });

  it('should fallback to simulation uploader if primary uploader is not configured', async () => {
    // Instantiate with simulation uploader as fallback
    const mockBuffer = Buffer.from('dummy file content');
    const uploader = new ResilientUploader([
      new CloudinaryUploadStrategy(), // Typically unconfigured in test
      new LocalSimulationUploadStrategy(),
    ]);

    const result = await uploader.upload(mockBuffer, 'photo.jpg', 'image/jpeg');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.isMock, true);
    assert.strictEqual(result.mediaType, 'IMAGE');
    assert.strictEqual(result.strategyUsed, 'LocalSimulation');
    assert.ok(result.fileUrl.startsWith('https://res.cloudinary.com/simulated-cloud/'));
  });

  it('should classify video mimetype correctly as VIDEO', async () => {
    const mockBuffer = Buffer.from('dummy video content');
    const uploader = new ResilientUploader([
      new LocalSimulationUploadStrategy(),
    ]);

    const result = await uploader.upload(mockBuffer, 'clip.mp4', 'video/mp4');
    assert.strictEqual(result.mediaType, 'VIDEO');
  });
});

