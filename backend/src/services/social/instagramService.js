import axios from 'axios';
import SocialAdapter from './socialAdapter.js';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * InstagramAdapter
 * Strategy implementation of SocialAdapter for Instagram Graph API.
 */
export class InstagramAdapter extends SocialAdapter {
  constructor() {
    super('Instagram');
  }

  /**
   * Publish a post to Instagram (Single Image / Reel / Carousel / Caption).
   */
  async publishPost({ accessToken, platformAccountId, caption, mediaUrls = [], mediaType }) {
    logger.info(`[InstagramAdapter] Attempting to publish post for account: ${platformAccountId || 'default'}`);

    // If live token & account ID exist, perform Meta Graph API publish flow
    if (accessToken && platformAccountId && !accessToken.startsWith('mock_')) {
      try {
        const instagramId = platformAccountId;
        const imageUrl = mediaUrls[0] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'; // Default image fallback if caption-only

        // Step 1: Create Media Container
        const containerResponse = await axios.post(
          `${config.social.instagram.graphBaseUrl}/${instagramId}/media`,
          {
            image_url: imageUrl,
            caption: caption,
            access_token: accessToken,
          }
        );

        const containerId = containerResponse.data?.id;
        if (!containerId) {
          throw new Error('Failed to obtain Instagram media container ID.');
        }

        // Step 2: Publish Media Container
        const publishResponse = await axios.post(
          `${config.social.instagram.graphBaseUrl}/${instagramId}/media_publish`,
          {
            creation_id: containerId,
            access_token: accessToken,
          }
        );

        const publishedMediaId = publishResponse.data?.id;

        return {
          success: true,
          platform: 'INSTAGRAM',
          externalPostId: publishedMediaId,
          externalPostUrl: `https://www.instagram.com/p/${publishedMediaId}/`,
          rawResponse: publishResponse.data,
          isMock: false,
          strategyUsed: this.name,
        };
      } catch (error) {
        logger.error(`[InstagramAdapter] Graph API Error: ${error.response?.data?.error?.message || error.message}`);
        throw new Error(`Instagram Publish Failed: ${error.response?.data?.error?.message || error.message}`);
      }
    }

    // Dev / Sandbox Mock Publisher when using sandbox credentials
    logger.info('[InstagramAdapter] Executing in Sandbox/Simulation mode.');
    const mockPostId = `ig_post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    return {
      success: true,
      platform: 'INSTAGRAM',
      externalPostId: mockPostId,
      externalPostUrl: `https://www.instagram.com/p/${mockPostId}/`,
      rawResponse: {
        id: mockPostId,
        caption: caption.substring(0, 50) + '...',
        media_count: mediaUrls.length || 1,
        status: 'SIMULATED_SUCCESS',
      },
      isMock: true,
      strategyUsed: this.name,
    };
  }

  /**
   * Refresh long-lived Instagram User Access Token
   */
  async refreshToken({ accessToken }) {
    // Overloaded to accept both object input and direct token
    const token = typeof arguments[0] === 'string' ? arguments[0] : accessToken;

    if (!token || token.startsWith('mock_')) {
      return {
        accessToken: `mock_ig_refreshed_${Date.now()}`,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      };
    }

    try {
      const response = await axios.get(`${config.social.instagram.apiBaseUrl}/refresh_access_token`, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: token,
        },
      });

      return {
        accessToken: response.data.access_token,
        expiresAt: new Date(Date.now() + (response.data.expires_in || 5184000) * 1000),
      };
    } catch (error) {
      logger.error(`[InstagramAdapter] Token Refresh Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Exchange Instagram OAuth Code (stubbed / fallback)
   */
  async exchangeToken({ code, redirectUri }) {
    logger.info('[InstagramAdapter] Simulating code exchange.');
    return {
      accessToken: `mock_ig_token_${Date.now()}`,
      refreshToken: `mock_ig_refresh_${Date.now()}`,
      expiresIn: 5184000,
    };
  }
}

// Support singleton and backward compat static methods
export const defaultInstagramAdapter = new InstagramAdapter();
export default defaultInstagramAdapter;
