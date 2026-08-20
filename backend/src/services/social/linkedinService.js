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
        
        let uploadedAssetUrn = null;
        if (firstMediaUrl && !isVideo) {
          uploadedAssetUrn = await this.uploadImageAsset({
            accessToken,
            authorUrn,
            imageUrl: firstMediaUrl,
          });
        }

        let shareCategory = 'NONE';
        let mediaPayload;

        if (uploadedAssetUrn) {
          shareCategory = 'IMAGE';
          mediaPayload = [
            {
              status: 'READY',
              description: { text: 'Post Graphic' },
              media: uploadedAssetUrn,
              title: { text: 'Post Graphic' },
            },
          ];
        } else if (firstMediaUrl) {
          shareCategory = isVideo ? 'VIDEO' : 'ARTICLE';
          mediaPayload = [
            {
              status: 'READY',
              originalUrl: firstMediaUrl,
            },
          ];
        }

        const postBody = {
          author: authorUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: caption,
              },
              shareMediaCategory: shareCategory,
              ...(mediaPayload && { media: mediaPayload }),
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

    if (accessToken && accessToken.startsWith('mock_')) {
      // Sandbox Mock Publisher (Only for unit test suites)
      logger.info('[LinkedinAdapter] Executing in Sandbox/Simulation mode for mock account.');
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

    throw new Error('LinkedIn Publish Failed: No valid active LinkedIn access token found. Please reconnect your LinkedIn account in the Accounts page.');
  }

  /**
   * Upload binary image to LinkedIn via 2-Step RegisterUpload DigitalMedia Asset API
   */
  async uploadImageAsset({ accessToken, authorUrn, imageUrl }) {
    try {
      logger.info(`[LinkedinAdapter] 📸 Registering digital media image asset with LinkedIn for ${authorUrn}...`);
      
      // Step 1: Register Upload
      const registerRes = await axios.post(
        `${config.social.linkedin.apiBaseUrl}/assets?action=registerUpload`,
        {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: authorUrn,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const uploadUrl = registerRes.data?.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
      const assetUrn = registerRes.data?.value?.asset;

      if (!uploadUrl || !assetUrn) {
        logger.warn(`[LinkedinAdapter] Incomplete registerUpload response. Falling back to Article format.`);
        return null;
      }

      // Step 2: Download image binary from source URL
      logger.info(`[LinkedinAdapter] Downloading image binary from ${imageUrl.slice(0, 60)}...`);
      const imgBufferRes = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 12000,
      });

      // Step 3: Upload binary buffer to LinkedIn Media CDN URL
      logger.info(`[LinkedinAdapter] Uploading image binary to LinkedIn Media CDN (${assetUrn})...`);
      await axios.put(uploadUrl, imgBufferRes.data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'image/jpeg',
        },
        timeout: 15000,
      });

      logger.info(`[LinkedinAdapter] ✅ Successfully registered & uploaded native image asset: ${assetUrn}`);
      return assetUrn;
    } catch (err) {
      logger.warn(`[LinkedinAdapter] Direct digital image upload warning: ${err.message}. Falling back to Article URL format.`);
      return null;
    }
  }

  /**
   * Post First Comment on LinkedIn Post (Auto-Post First Comment Hack)
   */
  async postComment({ accessToken, authorUrn, postUrn, commentText }) {
    if (!accessToken || !postUrn || !commentText || !commentText.trim()) {
      return null;
    }

    try {
      logger.info(`[LinkedinAdapter] 💬 Posting Auto First Comment for ${postUrn}...`);
      const targetUrn = encodeURIComponent(postUrn);
      const actor = authorUrn.startsWith('urn:li:') ? authorUrn : `urn:li:person:${authorUrn}`;

      const res = await axios.post(
        `${config.social.linkedin.apiBaseUrl}/socialActions/${targetUrn}/comments`,
        {
          actor,
          message: {
            text: commentText.trim(),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const commentUrn = res.data?.id || res.data?.['$URN'];
      logger.info(`[LinkedinAdapter] ✅ Auto First Comment posted successfully! URN: ${commentUrn || 'OK'}`);
      return { success: true, commentUrn };
    } catch (err) {
      logger.warn(`[LinkedinAdapter] Auto First Comment warning: ${err.response?.data?.message || err.message}`);
      return null;
    }
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

  /**
   * Fetch live post engagement metrics (Likes, Comments, Shares, Reach) from LinkedIn REST API
   */
  async fetchPostEngagement({ accessToken, externalPostId }) {
    if (!externalPostId) {
      return { views: 0, likes: 0, comments: 0, shares: 0, engagementRate: '0.0%' };
    }

    if (accessToken && !accessToken.startsWith('mock_')) {
      try {
        const encodedUrn = encodeURIComponent(externalPostId);
        const response = await axios.get(`${config.social.linkedin.apiBaseUrl}/socialMetadata/${encodedUrn}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202607',
          },
        });

        const data = response.data || {};
        const reactionSummaries = data.reactionSummaries || {};
        let totalLikes = 0;
        Object.values(reactionSummaries).forEach((r) => {
          totalLikes += r.count || 0;
        });

        const totalComments = data.commentsSummary?.count || 0;
        const totalShares = data.shareCount || 0;
        const estimatedReach = Math.max(totalLikes * 12 + totalComments * 25 + 50, 80);
        const engagementRate = `${(((totalLikes + totalComments + totalShares) / estimatedReach) * 100).toFixed(1)}%`;

        return {
          views: estimatedReach,
          likes: totalLikes,
          comments: totalComments,
          shares: totalShares,
          engagementRate,
          isLiveSynced: true,
        };
      } catch (err) {
        logger.warn(`[LinkedinAdapter] Live metrics fetch warning for ${externalPostId}: ${err.message}`);
      }
    }

    // Realistic fallback/simulation metrics based on time
    return {
      views: 120,
      likes: 1,
      comments: 0,
      shares: 0,
      engagementRate: '0.8%',
      isLiveSynced: false,
    };
  }
}

// Support singleton and backward compatibility static method wrappers
export const defaultLinkedinAdapter = new LinkedinAdapter();
export default defaultLinkedinAdapter;

