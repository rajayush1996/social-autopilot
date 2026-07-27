import 'dotenv/config';
import { processVideo } from '../src/services/upload/r2Upload.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

async function testCompression() {
  console.log('--- Testing Real FFmpeg Video Encoding & Compression ---');
  console.log('FFmpeg Path:', ffmpegStatic);
  console.log('FFmpeg Binary Exists:', fs.existsSync(ffmpegStatic));

  // Create a 2-second test video using FFmpeg synthetic testsrc
  const tempInput = path.join(process.cwd(), 'scratch', 'sample_input.mp4');

  console.log('\nStep 1: Generating 2-second test MP4 video...');
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input('testsrc=size=1920x1080:rate=30')
      .inputFormat('lavfi')
      .input('sine=frequency=1000:sample_rate=44100')
      .inputFormat('lavfi')
      .duration(2)
      .outputOptions(['-c:v libx264', '-b:v 15000k', '-c:a aac'])
      .save(tempInput)
      .on('end', resolve)
      .on('error', reject);
  });

  const inputStats = fs.statSync(tempInput);
  console.log(`Original Test Video Size: ${inputStats.size} bytes (${(inputStats.size / 1024 / 1024).toFixed(2)} MB)`);

  console.log('\nStep 2: Processing video with processVideo (H.264 CRF 28 + 2.5M bitrate limit)...');
  const rawBuffer = fs.readFileSync(tempInput);
  const result = await processVideo(rawBuffer, 'instagram_feed');

  console.log(`Compressed Video Size: ${result.buffer.length} bytes (${(result.buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Compression Ratio: ${((1 - result.buffer.length / inputStats.size) * 100).toFixed(1)}% size reduction!`);

  // Cleanup temp input
  if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
}

testCompression().catch(console.error);
