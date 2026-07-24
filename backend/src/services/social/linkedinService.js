import axios from 'axios';
import SocialAdapter from './socialAdapter.js';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * LinkedinAdapter
 * Strategy implementation of SocialAdapter for LinkedIn REST API.
 */
export class LinkedinAdapter extends SocialAdapter {
  constructor() {
    super('LinkedIn');
  }

  /**
   * Publish a post to LinkedIn.
   */
  async publishPost({ accessToken, platformAccountId, caption, mediaUrls = [], mediaType }) {
    logger.info(`[LinkedinAdapter] Attempting to publish post for author URN: ${platformAccountId || 'default'}`);

    // Live API execution if real OAuth token exists
    if (accessToken && platformAccountId && !accessToken.startsWith('mock_')) {
      try {
        const authorUrn = platformAccountId.startsWith('urn:li:')
          ? platformAccountId
          : `urn:li:person:${platformAccountId}`;

        const postBody = {
          author: authorUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: caption,
              },
              shareMediaCategory: mediaUrls.length > 0 ? 'ARTICLE' : 'NONE',
              ...(mediaUrls.length > 0 && {
                media: [
                  {
                    status: 'READY',
                    originalUrl: mediaUrls[0],
                  },
                ],
              }),
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        };

        const response = await axios.post(`${config.social.linkedin.apiBaseUrl}/ugcPosts`, postBody, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
          },
        });

        const postId = response.data?.id;

        return {
          success: true,
          platform: 'LINKEDIN',
          externalPostId: postId,
          externalPostUrl: `https://www.linkedin.com/feed/update/${postId}/`,
          rawResponse: response.data,
          isMock: false,
          strategyUsed: this.name,
        };
      } catch (error) {
        logger.error(`[LinkedinAdapter] API Error: ${error.response?.data?.message || error.message}`);
        throw new Error(`LinkedIn Publish Failed: ${error.response?.data?.message || error.message}`);
      }
    }

    // Sandbox Mock Publisher
    logger.info('[LinkedinAdapter] Executing in Sandbox/Simulation mode.');
    const mockUrn = `urn:li:share:${Date.now()}`;

    return {
      success: true,
      platform: 'LINKEDIN',
      externalPostId: mockUrn,
      externalPostUrl: `https://www.linkedin.com/feed/update/${mockUrn}/`,
      rawResponse: {
        id: mockUrn,
        status: 'SIMULATED_SUCCESS',
        author: platformAccountId || 'urn:li:person:mock_user',
      },
      isMock: true,
      strategyUsed: this.name,
    };
  }

  /**
   * Exchange LinkedIn Authorization Code for Access Token
   */
  async exchangeToken({ code, redirectUri, clientId, clientSecret }) {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId || config.social.linkedin.clientId,
        client_secret: clientSecret || config.social.linkedin.clientSecret,
      });

      const response = await axios.post(`${config.social.linkedin.oauthBaseUrl}/accessToken`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const accessToken = response.data.access_token;
      let platformAccountId = null;
      let username = null;

      try {
        const userinfoRes = await axios.get(`${config.social.linkedin.apiBaseUrl}/userinfo`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        platformAccountId = userinfoRes.data?.sub || null;
        username = userinfoRes.data?.name || userinfoRes.data?.email || null;
      } catch (profileErr) {
        logger.warn(`[LinkedinAdapter] userinfo fetch warning: ${profileErr.message}`);
      }

      return {
        accessToken,
        expiresIn: response.data.expires_in,
        platformAccountId,
        username,
      };
    } catch (error) {
      logger.error(`[LinkedinAdapter] OAuth Error: ${error.response?.data?.message || error.message}`);
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
        accessToken: `mock_linkedin_refreshed_${Date.now()}`,
        refreshToken: `mock_linkedin_refresh_new_${Date.now()}`,
        expiresIn: 5184000,
      };
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId || config.social.linkedin.clientId,
        client_secret: clientSecret || config.social.linkedin.clientSecret,
      });

      const response = await axios.post(`${config.social.linkedin.oauthBaseUrl}/accessToken`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      logger.error(`[LinkedinAdapter] Token Refresh Error: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }
}

// Support singleton and backward compatibility static method wrappers
export const defaultLinkedinAdapter = new LinkedinAdapter();
export default defaultLinkedinAdapter;
