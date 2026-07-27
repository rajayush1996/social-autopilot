import sharp from 'sharp';
import { processImage } from '../src/services/upload/r2Upload.js';

async function testSharpCompression() {
  console.log('--- Testing Sharp MozJPEG Image Compression ---');

  // Create an uncompressed 3000x3000 raw image in memory (~3MB PNG/RAW)
  const inputBuffer = await sharp({
    create: {
      width: 3000,
      height: 3000,
      channels: 4,
      background: { r: 240, g: 100, b: 50, alpha: 1 }
    }
  })
  .png({ compressionLevel: 0 }) // Uncompressed PNG
  .toBuffer();

  const originalSizeMB = (inputBuffer.length / (1024 * 1024)).toFixed(2);
  const originalSizeKB = (inputBuffer.length / 1024).toFixed(2);
  console.log(`Original Input Image Size: ${originalSizeMB} MB (${originalSizeKB} KB, Bytes: ${inputBuffer.length})`);

  // Run processImage (Sharp MozJPEG quality 80)
  const result = await processImage(inputBuffer, 'instagram_feed');
  const compressedSizeMB = (result.buffer.length / (1024 * 1024)).toFixed(2);
  const compressedSizeKB = (result.buffer.length / 1024).toFixed(2);
  const ratio = (((inputBuffer.length - result.buffer.length) / inputBuffer.length) * 100).toFixed(1);

  console.log(`Compressed Output Image Size: ${compressedSizeMB} MB (${compressedSizeKB} KB, Bytes: ${result.buffer.length})`);
  console.log(`MIME Type: ${result.mimeType}`);
  console.log(`Compression Reduction: ${ratio}% smaller!`);
}

testSharpCompression().catch(console.error);
