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

        const firstMediaUrl = mediaUrls[0] || '';
        const isVideo = mediaType === 'VIDEO' || firstMediaUrl.endsWith('.mp4') || firstMediaUrl.endsWith('.mov') || firstMediaUrl.includes('/uploads/videos/');
        const shareCategory = mediaUrls.length > 0 ? (isVideo ? 'VIDEO' : 'IMAGE') : 'NONE';

        const postBody = {
          author: authorUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: caption,
              },
              shareMediaCategory: shareCategory,
              ...(mediaUrls.length > 0 && {
                media: [
                  {
                    status: 'READY',
                    originalUrl: firstMediaUrl,
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
        const errorMsg = error.response?.data?.message || error.message || '';
        logger.error(`[LinkedinAdapter] API Error: ${errorMsg}`);

        // Gracefully resolve LinkedIn Duplicate Post: If content was already published, link to the existing live post
        const duplicateMatch = errorMsg.match(/urn:li:(?:share|ugcPost):\d+/i);
        if (duplicateMatch) {
          const existingUrn = duplicateMatch[0];
          logger.info(`[LinkedinAdapter] Post is already live on LinkedIn as duplicate URN: ${existingUrn}`);
          return {
            success: true,
            platform: 'LINKEDIN',
            externalPostId: existingUrn,
            externalPostUrl: `https://www.linkedin.com/feed/update/${existingUrn}/`,
            rawResponse: { message: errorMsg, isDuplicateOfExisting: true, existingUrn },
            isMock: false,
            strategyUsed: this.name,
          };
        }

        throw new Error(`LinkedIn Publish Failed: ${errorMsg}`);
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
      const expiresIn = response.data.expires_in;
      const accountsList = [];

      // 1. Fetch Personal Profile
      let personalUrn = null;
      let personalName = null;
      let personalAvatar = null;

      try {
        const userinfoRes = await axios.get(`${config.social.linkedin.apiBaseUrl}/userinfo`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const sub = userinfoRes.data?.sub;
        personalUrn = sub ? (sub.startsWith('urn:li:') ? sub : `urn:li:person:${sub}`) : null;
        personalName = userinfoRes.data?.name || userinfoRes.data?.email || 'LinkedIn Personal Profile';
        personalAvatar = userinfoRes.data?.picture || null;

        if (personalUrn) {
          accountsList.push({
            platformAccountId: personalUrn,
            username: personalName,
            accountName: `${personalName} (Personal)`,
            accountType: 'PERSONAL',
            avatarUrl: personalAvatar,
          });
        }
      } catch (profileErr) {
        logger.warn(`[LinkedinAdapter] Personal profile fetch warning: ${profileErr.message}`);
      }

      // 2. Fetch Managed LinkedIn Company Pages (Organizations)
      try {
        const aclsRes = await axios.get(`${config.social.linkedin.apiBaseUrl}/organizationalEntityAcls?q=roleAssignee`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202607',
          },
        });

        const elements = aclsRes.data?.elements || [];
        const adminRoles = ['ADMINISTRATOR', 'CONTENT_ADMINISTRATOR', 'ADMIN', 'OWNER'];

        for (const elem of elements) {
          const role = elem.role || elem.roleType;
          if (adminRoles.includes(role) && elem.organizationalTarget) {
            const orgUrn = elem.organizationalTarget;
            const orgId = orgUrn.replace('urn:li:organization:', '');

            let orgName = `Company Page (${orgId})`;
            let orgLogo = null;

            try {
              const orgDetailsRes = await axios.get(`${config.social.linkedin.apiBaseUrl}/organizations/${orgId}`, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'LinkedIn-Version': '202607',
                },
              });
              orgName = orgDetailsRes.data?.localizedName || orgDetailsRes.data?.name || orgName;
              orgLogo = orgDetailsRes.data?.logoV2?.['cropped~']?.elements?.[0]?.identifiers?.[0]?.identifier || null;
            } catch (orgDetailErr) {
              logger.warn(`[LinkedinAdapter] Details fetch failed for org ${orgId}: ${orgDetailErr.message}`);
            }

            accountsList.push({
              platformAccountId: orgUrn,
              username: orgName,
              accountName: `${orgName} (Company Page)`,
              accountType: 'ORGANIZATION',
              avatarUrl: orgLogo,
            });
          }
        }
      } catch (orgsErr) {
        logger.warn(`[LinkedinAdapter] Organizational ACLs fetch warning: ${orgsErr.message}`);
      }

      // Fallback if no specific account was returned
      if (accountsList.length === 0) {
        accountsList.push({
          platformAccountId: personalUrn || `urn:li:person:user_${Date.now()}`,
          username: personalName || 'LinkedIn Account',
          accountName: 'LinkedIn Account',
          accountType: 'PERSONAL',
          avatarUrl: null,
        });
      }

      return {
        accessToken,
        expiresIn,
        accounts: accountsList,
        platformAccountId: accountsList[0].platformAccountId,
        username: accountsList[0].username,
        accountType: accountsList[0].accountType,
        avatarUrl: accountsList[0].avatarUrl,
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
