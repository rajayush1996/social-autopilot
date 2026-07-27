import 'dotenv/config';
import defaultUploader from '../src/services/upload/resilientUploader.js';

async function testVideoUpload() {
  console.log('--- Testing Live Cloudflare R2 Video Upload ---');
  // Dummy 1-second silent MP4 header buffer
  const sampleVideoBuffer = Buffer.from(
    'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAABtZGF0',
    'base64'
  );

  try {
    const result = await defaultUploader.upload(
      sampleVideoBuffer,
      'test_clip.mp4',
      'video/mp4',
      'instagram_feed'
    );
    console.log('✅ Video Upload Result:', result);
  } catch (err) {
    console.error('❌ Video Upload Failed:', err);
  }
}

testVideoUpload();
