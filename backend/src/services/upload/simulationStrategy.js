import UploadStrategy from './uploadStrategy.js';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * LocalSimulationUploadStrategy
 * Staging / Sandbox fallback strategy that constructs simulated URLs without connecting to Cloudinary.
 */
export class LocalSimulationUploadStrategy extends UploadStrategy {
  constructor() {
    super();
    this.name = 'LocalSimulation';
  }

  isConfigured() {
    // Always configured as a fallback uploader
    return true;
  }

  async upload(fileBuffer, fileName, mimeType) {
    logger.info(`[LocalSimulationUploadStrategy] Simulating uploader run for: ${fileName}`);

    // Build simulation host url from bootstrap configuration
    const hostUrl = config.cloudinary.simulationHostUrl || 'https://res.cloudinary.com/simulated-cloud/image/upload';
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/\s+/g, '_');
    
    const mockFileUrl = `${hostUrl}/v${timestamp}/social_autopilot/${timestamp}-${cleanFileName}`;
    const mediaType = mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE';

    return {
      success: true,
      fileUrl: mockFileUrl,
      mediaType,
      publicId: `simulated_public_id_${timestamp}`,
      isMock: true,
      strategyUsed: this.name,
      rawResponse: {
        status: 'SIMULATED_SUCCESS',
        filename: fileName,
        mimeType,
        sizeBytes: fileBuffer.length,
      },
    };
  }
}

export default LocalSimulationUploadStrategy;
