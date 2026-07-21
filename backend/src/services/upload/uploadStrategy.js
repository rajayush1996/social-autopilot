/**
 * UploadStrategy Interface
 * Defines uniform contract for different upload strategies (Cloudinary, simulation, local, etc.).
 */
export class UploadStrategy {
  /**
   * Check if strategy is configured and ready to be used.
   * @returns {Boolean}
   */
  isConfigured() {
    return true;
  }

  /**
   * Upload a file from memory buffer.
   * 
   * @param {Buffer} fileBuffer - The file raw buffer
   * @param {String} fileName - The original file name
   * @param {String} mimeType - File mimetype (e.g. image/jpeg, video/mp4)
   * @returns {Promise<Object>} Formatted result object containing fileUrl
   */
  async upload(fileBuffer, fileName, mimeType) {
    throw new Error('UploadStrategy.upload() method must be implemented.');
  }
}

export default UploadStrategy;
