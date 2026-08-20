import axios from 'axios';
import SocialAdapter from './socialAdapter.js';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * XAdapter
 * Strategy implementation of SocialAdapter for X (Twitter) API.
 */
export class XAdapter extends SocialAdapter {
  constructor() {
    super('X');
  }

  /**
   * Publish a tweet to X (Twitter).
   */
  async publishPost({ accessToken, platformAccountId, caption, mediaUrls = [], mediaType }) {
    logger.info(`[XAdapter] Attempting to publish tweet for account: ${platformAccountId || 'default'}`);

    // Text formatting for 280 char limit with rich media link inclusion
    let tweetText = caption;
    if (mediaUrls && mediaUrls.length > 0 && !tweetText.includes(mediaUrls[0])) {
      tweetText = `${tweetText}\n\n${mediaUrls[0]}`;
    }
    tweetText = tweetText.length > 280 ? tweetText.substring(0, 277) + '...' : tweetText;

    if (accessToken && !accessToken.startsWith('mock_')) {
      try {
        const payload = {
          text: tweetText,
        };

        const response = await axios.post(`${config.social.x.baseUrl}/tweets`, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        const tweetId = response.data?.data?.id;

        return {
          success: true,
          platform: 'X',
          externalPostId: tweetId,
          externalPostUrl: `https://x.com/i/status/${tweetId}`,
          rawResponse: response.data,
          isMock: false,
          strategyUsed: this.name,
        };
      } catch (error) {
        logger.error(`[XAdapter] Twitter API v2 Error: ${error.response?.data?.detail || error.message}`);
        throw new Error(`X Tweet Publish Failed: ${error.response?.data?.detail || error.message}`);
      }
    }

    if (accessToken && accessToken.startsWith('mock_')) {
      // Sandbox Mock Publisher
      logger.info('[XAdapter] Executing in Sandbox/Simulation mode for mock account.');
      const mockTweetId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

      return {
        success: true,
        platform: 'X',
        externalPostId: mockTweetId,
        externalPostUrl: `https://x.com/user/status/${mockTweetId}`,
        rawResponse: {
          data: {
            id: mockTweetId,
            text: tweetText,
            status: 'SIMULATED_SUCCESS',
          },
        },
        isMock: true,
        strategyUsed: this.name,
      };
    }

    throw new Error('X Tweet Publish Failed: No valid active X access token found. Please reconnect your X account in the Accounts page.');
  }

  /**
   * OAuth 2.0 PKCE Token Exchange Helper
   */
  async exchangeToken({ code, codeVerifier, redirectUri, clientId, clientSecret }) {
    try {
      const authHeader = Buffer.from(
        `${clientId || config.social.x.clientId}:${clientSecret || config.social.x.clientSecret}`
      ).toString('base64');

      const params = new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId || config.social.x.clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier || 'challenge',
      });

      const response = await axios.post(`${config.social.x.baseUrl}/oauth2/token`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authHeader}`,
        },
      });

      const accessToken = response.data.access_token;
      const profileData = await this.getUserProfile(accessToken);

      return {
        accessToken,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        platformAccountId: profileData.id || `x_${Date.now()}`,
        username: profileData.username || `x_user_${Date.now()}`,
        isPremium: profileData.isPremium,
      };
    } catch (error) {
      logger.error(`[XAdapter] OAuth Token Exchange Error: ${error.response?.data?.detail || error.message}`);
      throw error;
    }
  }

  /**
   * Fetch authenticated X user profile & detect X Premium / Twitter Blue verification status
   */
  async getUserProfile(accessToken) {
    if (!accessToken || accessToken.startsWith('mock_')) {
      return {
        id: 'mock_x_user',
        username: 'mock_x_creator',
        name: 'Mock Creator',
        isPremium: false,
      };
    }

    try {
      const response = await axios.get(`${config.social.x.baseUrl}/users/me?user.fields=verified,verified_type`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const userData = response.data?.data;
      const isPremium = Boolean(userData?.verified || userData?.verified_type === 'blue');

      return {
        id: userData?.id,
        username: userData?.username,
        name: userData?.name,
        isPremium,
      };
    } catch (error) {
      logger.warn(`[XAdapter] Get user profile warning: ${error.message}`);
      return { isPremium: false };
    }
  }

  /**
   * Alias for exchangeToken
   */
  async getAccessToken(params) {
    return this.exchangeToken(params);
  }

  /**
   * OAuth 2.0 Refresh Token Exchange Helper
   */
  async refreshToken({ refreshToken, clientId, clientSecret }) {
    if (!refreshToken || refreshToken.startsWith('mock_')) {
      return {
        accessToken: `mock_x_refreshed_${Date.now()}`,
        refreshToken: `mock_x_refresh_new_${Date.now()}`,
        expiresIn: 7200,
      };
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId || config.social.x.clientId,
      });

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      const finalClientSecret = clientSecret || config.social.x.clientSecret;
      const finalClientId = clientId || config.social.x.clientId;
      if (finalClientSecret) {
        const authHeader = Buffer.from(`${finalClientId}:${finalClientSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${authHeader}`;
      }

      const response = await axios.post(`${config.social.x.baseUrl}/oauth2/token`, params, { headers });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      logger.error(`[XAdapter] OAuth Token Refresh Error: ${error.response?.data?.detail || error.message}`);
      throw error;
    }
  }
}

// Support singleton and backward compatibility static method wrappers
export const defaultXAdapter = new XAdapter();
export default defaultXAdapter;
