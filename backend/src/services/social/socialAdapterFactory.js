import InstagramAdapter from './instagramService.js';
import LinkedinAdapter from './linkedinService.js';
import XAdapter from './xService.js';

/**
 * SocialAdapterFactory (Creational Design Pattern)
 * Instantiates and returns the appropriate adapter strategy for a given social platform.
 */
export class SocialAdapterFactory {
  /**
   * Get the social adapter strategy instance for the target platform.
   * 
   * @param {String} platform - Target platform (e.g. INSTAGRAM, LINKEDIN, X, TWITTER)
   * @returns {SocialAdapter} The platform strategy adapter
   */
  static getAdapter(platform) {
    if (!platform) {
      throw new Error('Platform parameter is required to resolve adapter strategy.');
    }

    const platformUpper = platform.toUpperCase();

    switch (platformUpper) {
      case 'INSTAGRAM':
        return InstagramAdapter; // Using singleton default export

      case 'LINKEDIN':
        return LinkedinAdapter; // Using singleton default export

      case 'X':
      case 'TWITTER':
        return XAdapter; // Using singleton default export

      default:
        throw new Error(`Unsupported platform adapter strategy: "${platformUpper}"`);
    }
  }
}

export default SocialAdapterFactory;
