import R2UploadStrategy from './r2Strategy.js';
import CloudinaryUploadStrategy from './cloudinaryStrategy.js';
import LocalStorageUploadStrategy from './localStorageStrategy.js';
import LocalSimulationUploadStrategy from './simulationStrategy.js';
import ResilientUploader from './resilientUploader.js';
import logger from '../../utils/logger.js';

/**
 * UploadStrategyFactory
 * Factory Pattern implementation to instantiate and manage Upload Strategies.
 */
export class UploadStrategyFactory {
  /**
   * Get an instance of a specific upload strategy by name.
   * 
   * @param {String} type - Strategy type ('r2', 'cloudinary', 'local', 'simulation')
   * @returns {UploadStrategy}
   */
  static getStrategy(type = 'r2') {
    const normalizedType = String(type).toLowerCase().trim();

    switch (normalizedType) {
      case 'r2':
      case 'cloudflare':
      case 'cloudflarel2':
        return new R2UploadStrategy();

      case 'cloudinary':
        return new CloudinaryUploadStrategy();

      case 'local':
      case 'localstorage':
        return new LocalStorageUploadStrategy();

      case 'simulation':
      case 'mock':
        return new LocalSimulationUploadStrategy();

      default:
        logger.warn(`[UploadStrategyFactory] Unknown strategy "${type}". Defaulting to Cloudflare R2.`);
        return new R2UploadStrategy();
    }
  }

  /**
   * Get primary configured strategy dynamically based on configuration.
   * Priority: Cloudflare R2 -> Cloudinary -> Local Storage -> Simulation
   */
  static getPrimaryConfiguredStrategy() {
    const strategies = [
      new R2UploadStrategy(),
      new CloudinaryUploadStrategy(),
      new LocalStorageUploadStrategy(),
      new LocalSimulationUploadStrategy(),
    ];

    const configured = strategies.find((s) => s.isConfigured());
    return configured || new LocalSimulationUploadStrategy();
  }

  /**
   * Create a ResilientUploader instance with customized fallback strategy ordering.
   * 
   * @param {Array<String>} priorityList - Array of strategy keys in priority order
   * @returns {ResilientUploader}
   */
  static createResilientUploader(priorityList = ['r2', 'cloudinary', 'local', 'simulation']) {
    const strategies = priorityList.map((type) => this.getStrategy(type));
    return new ResilientUploader(strategies);
  }
}

export default UploadStrategyFactory;
