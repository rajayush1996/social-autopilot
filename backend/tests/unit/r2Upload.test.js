import { describe, it } from 'node:test';
import assert from 'node:assert';
import sharp from 'sharp';
import { processImage } from '../../src/services/upload/r2Upload.js';

describe('R2 Media Processing Unit Tests', () => {
  it('should resize and compress image to JPEG format with Sharp', async () => {
    // Generate a simple test 200x200 PNG image buffer using sharp
    const testBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const processed = await processImage(testBuffer, 'instagram_reel');

    assert.strictEqual(processed.mimeType, 'image/jpeg');
    assert.strictEqual(processed.fileNameExt, '.jpg');
    assert.ok(processed.buffer.length > 0);

    // Verify metadata of processed image
    const metadata = await sharp(processed.buffer).metadata();
    assert.strictEqual(metadata.format, 'jpeg');
    assert.strictEqual(metadata.width, 1080);
    assert.strictEqual(metadata.height, 1920);
  });

  it('should correctly format landscape image for LinkedIn / X', async () => {
    const testBuffer = await sharp({
      create: {
        width: 3000,
        height: 1500,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    const processed = await processImage(testBuffer, 'linkedin');
    const metadata = await sharp(processed.buffer).metadata();

    assert.strictEqual(metadata.format, 'jpeg');
    assert.ok(metadata.width <= 1920);
    assert.ok(metadata.height <= 1080);
  });
});
