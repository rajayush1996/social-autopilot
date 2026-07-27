import { describe, it } from 'node:test';
import assert from 'node:assert';
import { processAndUploadVideo, uploadToR2 } from '../../src/services/upload/r2Upload.js';

describe('R2 Video Compression & Upload Unit Tests', () => {
  it('should export processAndUploadVideo function correctly', () => {
    assert.strictEqual(typeof processAndUploadVideo, 'function');
  });

  it('should export uploadToR2 function correctly', () => {
    assert.strictEqual(typeof uploadToR2, 'function');
  });
});
