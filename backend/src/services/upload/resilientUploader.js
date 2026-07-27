import R2UploadStrategy from './r2Strategy.js';
import CloudinaryUploadStrategy from './cloudinaryStrategy.js';
import LocalStorageUploadStrategy from './localStorageStrategy.js';
import LocalSimulationUploadStrategy from './simulationStrategy.js';
import logger from '../../utils/logger.js';

/**
 * ResilientUploader
 * Context runner combining Strategy and Fallback (Resilience) Patterns.
 * Attempts upload using a series of strategies in priority order.
 */
export class ResilientUploader {
  /**
   * Initialize uploader with prioritized strategies.
   * @param {Array<UploadStrategy>} [strategies] - List of upload strategies to try
   */
  constructor(strategies = null) {
    this.strategies = strategies || [
      new R2UploadStrategy(),
      new CloudinaryUploadStrategy(),
      new LocalStorageUploadStrategy(),
      new LocalSimulationUploadStrategy(),
    ];
  }

  /**
   * Coordinate file upload attempting each strategy sequentially until one succeeds.
   * 
   * @param {Buffer} fileBuffer 
   * @param {String} fileName 
   * @param {String} mimeType 
   * @returns {Promise<Object>} Strategy upload result containing fileUrl
   */
  async upload(fileBuffer, fileName, mimeType, targetPlatform = 'instagram_feed') {
    logger.info(`[ResilientUploader] Starting resilient upload process for: ${fileName} (Target Platform: ${targetPlatform})`);

    let lastError = null;

    for (const strategy of this.strategies) {
      if (!strategy.isConfigured()) {
        logger.debug(`[ResilientUploader] Skipping strategy "${strategy.name}" (Not configured).`);
        continue;
      }

      logger.info(`[ResilientUploader] Attempting upload using strategy: "${strategy.name}"...`);

      try {
        const result = await strategy.upload(fileBuffer, fileName, mimeType, targetPlatform);
        if (result && result.success) {
          logger.info(`[ResilientUploader] Upload succeeded using strategy: "${strategy.name}"`);
          return result;
        }
      } catch (err) {
        lastError = err;
        logger.warn(`[ResilientUploader] Strategy "${strategy.name}" failed: ${err.message}. Cascading to next strategy...`);
      }
    }

    throw new Error(
      `Resilient upload failed. Tried all strategies. Last error: ${lastError ? lastError.message : 'No strategies ran'}`
    );
  }
}

// Export singleton helper uploader
export const defaultUploader = new ResilientUploader();
export default defaultUploader;
