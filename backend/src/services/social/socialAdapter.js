/**
 * SocialAdapter (Interface)
 * Base class contract for social platform adapter strategies (Instagram, LinkedIn, X).
 */
export class SocialAdapter {
  constructor(name) {
    this.name = name;
  }

  /**
   * Publish content to the social media platform.
   * 
   * @param {Object} params
   * @param {String} params.accessToken
   * @param {String} params.platformAccountId
   * @param {String} params.caption
   * @param {Array<String>} params.mediaUrls
   * @param {String} params.mediaType - IMAGE or VIDEO
   * @returns {Promise<Object>} Standardized post results
   */
  async publishPost({ accessToken, platformAccountId, caption, mediaUrls, mediaType }) {
    throw new Error(`publishPost() must be implemented for adapter "${this.name}".`);
  }

  /**
   * Refresh the access token.
   * 
   * @param {Object} params
   * @returns {Promise<Object>} Refreshed token payload
   */
  async refreshToken(params) {
    throw new Error(`refreshToken() must be implemented for adapter "${this.name}".`);
  }

  /**
   * Exchange OAuth Authorization Code for Access Token.
   * 
   * @param {Object} params
   * @returns {Promise<Object>} Exchanged access token payload
   */
  async exchangeToken(params) {
    throw new Error(`exchangeToken() must be implemented for adapter "${this.name}".`);
  }
}

export default SocialAdapter;
