import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import UploadStrategy from './uploadStrategy.js';
import { processImage, processVideo } from './r2Upload.js';
import config from '../../config/env.js';
import { UPLOAD_CONFIG } from '../../config/constants.js';
import logger from '../../utils/logger.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * R2UploadStrategy
 * Upload Strategy implementation for Cloudflare R2 with aggressive MozJPEG & FFmpeg compression.
 */
export class R2UploadStrategy extends UploadStrategy {
  constructor() {
    super();
    this.name = 'CloudflareR2';
    this.s3Client = null;
    this.initialize();
  }

  initialize() {
    if (this.isConfigured()) {
      this.s3Client = new S3Client({
        region: UPLOAD_CONFIG.DEFAULT_REGION,
        endpoint: config.r2.endpoint,
        credentials: {
          accessKeyId: config.r2.accessKeyId,
          secretAccessKey: config.r2.secretAccessKey,
        },
      });
    }
  }

  isConfigured() {
    const { accessKeyId, secretAccessKey, bucketName, endpoint } = config.r2 || {};
    return Boolean(
      accessKeyId &&
      secretAccessKey &&
      bucketName &&
      endpoint &&
      !accessKeyId.startsWith('your_')
    );
  }

  /**
   * Compress file buffer using Sharp MozJPEG or FFmpeg, then upload to Cloudflare R2.
   * 
   * @param {Buffer} fileBuffer 
   * @param {String} fileName 
   * @param {String} mimeType 
   * @param {String} [targetPlatform='instagram_feed']
   * @returns {Promise<Object>} Formatted result object containing fileUrl and compressed size
   */
  async upload(fileBuffer, fileName, mimeType, targetPlatform = 'instagram_feed') {
    logger.info(`[R2UploadStrategy] Initiating Cloudflare R2 upload with compression for: ${fileName}`);

    if (!this.s3Client) {
      this.initialize();
    }

    if (!this.s3Client) {
      throw new Error('Cloudflare R2 client is not configured properly.');
    }

    const isVideo = mimeType.startsWith('video/');
    const isImage = mimeType.startsWith('image/');
    let processedBuffer = fileBuffer;
    let finalMimeType = mimeType;
    let fileExt = path.extname(fileName) || '.bin';

    // 1. Apply Sharp MozJPEG or FFmpeg Compression BEFORE upload
    if (isImage) {
      logger.info(`[R2UploadStrategy] Compressing image with Sharp MozJPEG for ${fileName}...`);
      const compressed = await processImage(fileBuffer, targetPlatform);
      processedBuffer = compressed.buffer;
      finalMimeType = compressed.mimeType;
      fileExt = compressed.fileNameExt;
      logger.info(`[R2UploadStrategy] Image compressed from ${fileBuffer.length} bytes -> ${processedBuffer.length} bytes!`);
    } else if (isVideo) {
      logger.info(`[R2UploadStrategy] Compressing video with FFmpeg for ${fileName}...`);
      try {
        const compressed = await processVideo(fileBuffer, targetPlatform);
        processedBuffer = compressed.buffer;
        finalMimeType = compressed.mimeType;
        fileExt = compressed.fileNameExt;
        logger.info(`[R2UploadStrategy] Video compressed from ${fileBuffer.length} bytes -> ${processedBuffer.length} bytes!`);
      } catch (videoErr) {
        logger.warn(`[R2UploadStrategy] FFmpeg video compression failed (${videoErr.message}). Fallback to direct raw video upload to Cloudflare R2...`);
        processedBuffer = fileBuffer;
        finalMimeType = mimeType;
        fileExt = path.extname(fileName) || '.mp4';
      }
    }

    // 2. Generate key using timestamp + original name format in photos or videos folder
    const timestamp = Date.now();
    const cleanName = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9_-]/g, '_');
    const folder = isVideo ? 'uploads/videos' : 'uploads/photos';
    const objectKey = `${folder}/${timestamp}-${cleanName}${fileExt}`;
    const mediaType = isVideo ? 'VIDEO' : 'IMAGE';

    const command = new PutObjectCommand({
      Bucket: config.r2?.bucketName || process.env.CLOUDFLARE_R2_BUCKET_NAME || 'postpilot',
      Key: objectKey,
      Body: processedBuffer,
      ContentType: finalMimeType,
    });

    await this.s3Client.send(command);

    const publicHost = (
      process.env.CLOUDFLARE_R2_PUBLIC_URL ||
      process.env.R2_PUBLIC_DOMAIN ||
      process.env.R2_PUBLIC_URL ||
      config.r2?.publicUrl ||
      'https://media.avenar.in'
    ).replace(/\/$/, '');

    const fileUrl = `${publicHost}/${objectKey}`;

    logger.info(`[R2UploadStrategy] Upload success to R2. File public URL: ${fileUrl} (Size: ${processedBuffer.length} bytes)`);

    return {
      success: true,
      fileUrl,
      mediaType,
      publicId: objectKey,
      size: processedBuffer.length,
      originalSize: fileBuffer.length,
      isMock: false,
      strategyUsed: this.name,
      rawResponse: {
        bucket: config.r2.bucketName,
        key: objectKey,
        publicUrl: fileUrl,
        compressedSizeBytes: processedBuffer.length,
      },
    };
  }
}

export default R2UploadStrategy;
