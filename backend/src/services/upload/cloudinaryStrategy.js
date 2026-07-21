import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import UploadStrategy from './uploadStrategy.js';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * CloudinaryUploadStrategy
 * Primary strategy to stream upload files directly to Cloudinary.
 */
export class CloudinaryUploadStrategy extends UploadStrategy {
  constructor() {
    super();
    this.name = 'Cloudinary';
    this.initialize();
  }

  initialize() {
    if (this.isConfigured()) {
      cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
      });
    }
  }

  isConfigured() {
    const cloudName = config.cloudinary.cloudName;
    const apiKey = config.cloudinary.apiKey;
    const apiSecret = config.cloudinary.apiSecret;

    return (
      cloudName &&
      apiKey &&
      apiSecret &&
      !cloudName.startsWith('your_') &&
      !apiKey.startsWith('your_') &&
      !apiSecret.startsWith('your_')
    );
  }

  async upload(fileBuffer, fileName, mimeType) {
    logger.info(`[CloudinaryUploadStrategy] Initiating upload stream for file: ${fileName}`);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'social_autopilot',
          public_id: `${Date.now()}-${fileName.split('.')[0]}`,
        },
        (error, result) => {
          if (error) {
            logger.error(`[CloudinaryUploadStrategy] Upload failure: ${error.message}`);
            return reject(error);
          }

          resolve({
            success: true,
            fileUrl: result.secure_url,
            mediaType: mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE',
            publicId: result.public_id,
            isMock: false,
            strategyUsed: this.name,
            rawResponse: result,
          });
        }
      );

      const readable = new Readable();
      readable._read = () => {};
      readable.push(fileBuffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }
}

export default CloudinaryUploadStrategy;
