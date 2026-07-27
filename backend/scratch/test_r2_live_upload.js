import 'dotenv/config';
import { processAndUpload } from '../src/services/upload/r2Upload.js';
import defaultUploader from '../src/services/upload/resilientUploader.js';
import fs from 'fs';

async function testR2Upload() {
  console.log('--- Testing Live Cloudflare R2 Upload ---');
  console.log('R2 Endpoint:', process.env.CLOUDFLARE_R2_ENDPOINT);
  console.log('R2 Bucket:', process.env.CLOUDFLARE_R2_BUCKET_NAME);
  console.log('R2 Public URL:', process.env.CLOUDFLARE_R2_PUBLIC_URL);

  // 1-pixel red GIF buffer
  const sampleImageBuffer = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  try {
    console.log('\nTesting R2UploadStrategy via defaultUploader...');
    const result = await defaultUploader.upload(
      sampleImageBuffer,
      'test_photo.gif',
      'image/gif',
      'instagram_feed'
    );
    console.log('✅ Uploader Result:', result);
  } catch (err) {
    console.error('❌ Upload Failed:', err);
  }
}

testR2Upload();
