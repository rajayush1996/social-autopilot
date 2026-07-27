import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import UploadStrategy from './uploadStrategy.js';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../../public/uploads');

/**
 * LocalStorageUploadStrategy
 * Strategy implementation that saves uploaded media files locally to backend/public/uploads,
 * serves them via Express static middleware, and tracks disk paths for auto-cleanup.
 */
export class LocalStorageUploadStrategy extends UploadStrategy {
  constructor() {
    super();
    this.name = 'LocalStorage';
  }

  isConfigured() {
    return true; // Always available as a primary or fallback uploader
  }

  async upload(fileBuffer, fileName, mimeType) {
    logger.info(`[LocalStorageUploadStrategy] Writing local file: ${fileName}`);

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const targetFilename = `${timestamp}-${cleanFileName}`;
    const localFilePath = path.join(UPLOADS_DIR, targetFilename);

    // Save buffer locally to disk
    await fs.promises.writeFile(localFilePath, fileBuffer);

    const baseUrl = process.env.PUBLIC_APP_URL || process.env.BACKEND_URL || 'http://localhost:5000';
    const fileUrl = `${baseUrl}/uploads/${targetFilename}`;
    const mediaType = mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE';

    logger.info(`[LocalStorageUploadStrategy] Saved file to disk: ${localFilePath}`);

    return {
      success: true,
      fileUrl,
      localFilePath,
      mediaType,
      publicId: `local_${targetFilename}`,
      isMock: false,
      strategyUsed: this.name,
      rawResponse: {
        status: 'LOCAL_SUCCESS',
        filename: targetFilename,
        localFilePath,
        mimeType,
        sizeBytes: fileBuffer.length,
      },
    };
  }
}

export default LocalStorageUploadStrategy;
