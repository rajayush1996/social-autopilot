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

    // Text formatting for 280 char limit
    const tweetText = caption.length > 280 ? caption.substring(0, 277) + '...' : caption;

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

    // Sandbox Mock Publisher
    logger.info('[XAdapter] Executing in Sandbox/Simulation mode.');
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

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      logger.error(`[XAdapter] OAuth Token Exchange Error: ${error.response?.data?.detail || error.message}`);
      throw error;
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
