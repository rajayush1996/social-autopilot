import sharp from 'sharp';
import { processAndUpload } from '../src/services/upload/r2Upload.js';

async function uploadSampleImage() {
  console.log('--- Generating and Uploading Sample Compressed Image to R2 ---');

  // Create a sample 1920x1080 test image in memory
  const testImageBuffer = await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 3,
      background: { r: 79, g: 70, b: 229 } // Indigo brand color
    }
  })
  .jpeg()
  .toBuffer();

  const publicUrl = await processAndUpload(
    testImageBuffer,
    'autopilot_test_sample.jpg',
    'image/jpeg',
    'instagram_feed'
  );

  console.log('\n--- UPLOAD SUCCESSFUL ---');
  console.log(`Public URL: ${publicUrl}`);
}

uploadSampleImage().catch((err) => {
  console.error('Upload Error:', err);
});
