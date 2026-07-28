import axios from 'axios';
import SocialAdapter from './socialAdapter.js';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

export class FacebookAdapter extends SocialAdapter {
  constructor() {
    super('Facebook');
  }

  /**
   * Generate Facebook OAuth 2.0 Login URL for Pages management
   */
  async getAuthUrl({ redirectUri, state }) {
    const appId = config.social.facebook.appId || 'mock_facebook_app_id';
    const scope = encodeURIComponent(config.social.facebook.scope);
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
  }

  /**
   * OAuth 2.0 Token Exchange and Facebook Page Selection
   */
  async exchangeToken({ code, redirectUri, appId, appSecret }) {
    const fbAppId = appId || config.social.facebook.appId;
    const fbAppSecret = appSecret || config.social.facebook.appSecret;

    if (!fbAppId || !fbAppSecret || fbAppId === 'your_facebook_app_id' || fbAppId === 'mock_fb_app_id') {
      logger.info('[FacebookAdapter] No real Facebook App credentials configured in .env. Simulating code exchange for postPilot.');
      return {
        accessToken: `mock_fb_page_token_${Date.now()}`,
        refreshToken: `mock_fb_user_token_${Date.now()}`,
        expiresIn: 5184000,
        platformAccountId: `fb_page_${Date.now()}`,
        username: `postPilot`,
      };
    }

    try {

      // 1. Exchange authorization code for short-lived user access token
      const tokenUrl = `${config.social.facebook.graphBaseUrl}/oauth/access_token?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${fbAppSecret}&code=${code}`;
      const tokenRes = await axios.get(tokenUrl);
      const shortLivedToken = tokenRes.data.access_token;

      // 2. Exchange short-lived token for long-lived user token (60 days)
      const longLivedUrl = `${config.social.facebook.graphBaseUrl}/oauth/access_token?grant_type=fb_exchange_token&client_id=${fbAppId}&client_secret=${fbAppSecret}&fb_exchange_token=${shortLivedToken}`;
      const longLivedRes = await axios.get(longLivedUrl);
      const userAccessToken = longLivedRes.data.access_token || shortLivedToken;

      // 3. Inspect debug_token granular_scopes for targeted Facebook Page ID
      let pages = [];

      try {
        const debugRes = await axios.get(`${config.social.facebook.graphBaseUrl}/debug_token`, {
          params: {
            input_token: userAccessToken,
            access_token: userAccessToken,
          },
        });

        const granular = debugRes.data?.data?.granular_scopes || [];
        const pageScopeItem = granular.find(
          (g) => (g.scope === 'pages_manage_posts' || g.scope === 'pages_show_list' || g.scope === 'pages_read_engagement') && g.target_ids?.length > 0
        );

        if (pageScopeItem && pageScopeItem.target_ids[0]) {
          const targetPageId = pageScopeItem.target_ids[0];
          try {
            const pageInfo = await axios.get(`${config.social.facebook.graphBaseUrl}/${targetPageId}`, {
              params: {
                access_token: userAccessToken,
                fields: 'id,name,access_token,category',
              },
            });
            if (pageInfo.data?.id) {
              pages.push(pageInfo.data);
            }
          } catch (targetErr) {
            logger.warn(`[FacebookAdapter] Fetch targeted page ${targetPageId} failed: ${targetErr.message}`);
          }
        }
      } catch (debugErr) {
        logger.warn(`[FacebookAdapter] debug_token inspection failed: ${debugErr.message}`);
      }

      // 4. Query /me/accounts if no granular page was found
      if (pages.length === 0) {
        try {
          const pagesRes = await axios.get(`${config.social.facebook.graphBaseUrl}/me/accounts`, {
            params: {
              access_token: userAccessToken,
              fields: 'id,name,access_token,category',
            },
          });
          pages = pagesRes.data?.data || [];
        } catch (err) {
          logger.warn(`[FacebookAdapter] /me/accounts query failed: ${err.message}`);
        }
      }

      // 5. Fallback: Query /me?fields=accounts
      if (pages.length === 0) {
        try {
          const meRes = await axios.get(`${config.social.facebook.graphBaseUrl}/me`, {
            params: {
              access_token: userAccessToken,
              fields: 'id,name,accounts{id,name,access_token,category}',
            },
          });
          pages = meRes.data?.accounts?.data || [];
        } catch (err) {
          logger.warn(`[FacebookAdapter] /me accounts fallback failed: ${err.message}`);
        }
      }

      logger.info(`[FacebookAdapter] Total resolved pages: ${pages.length}`);

      // 6. If a Page is found, use primary Page; otherwise fallback to personal profile
      let targetAccountId = null;
      let targetAccountName = null;
      let targetAccessToken = userAccessToken;

      if (pages.length > 0) {
        const primaryPage = pages[0];
        targetAccountId = primaryPage.id;
        targetAccountName = primaryPage.name || primaryPage.id;
        targetAccessToken = primaryPage.access_token || userAccessToken;
      } else {
        // Ultimate Fallback: Connect authenticated Facebook Profile directly
        try {
          const profileRes = await axios.get(`${config.social.facebook.graphBaseUrl}/me`, {
            params: {
              access_token: userAccessToken,
              fields: 'id,name',
            },
          });
          targetAccountId = profileRes.data?.id || `fb_user_${Date.now()}`;
          targetAccountName = profileRes.data?.name || 'postPilot';
        } catch (profileErr) {
          targetAccountId = `fb_account_${Date.now()}`;
          targetAccountName = 'postPilot';
        }
      }

      return {
        accessToken: targetAccessToken,
        refreshToken: userAccessToken,
        expiresIn: 60 * 24 * 60 * 60, // ~60 days
        platformAccountId: targetAccountId,
        username: targetAccountName,
      };
    } catch (error) {
      logger.error(`[FacebookAdapter] Token Exchange Error: ${error.response?.data?.error?.message || error.message}`);
      throw error;
    }
  }

  /**
   * Publish post (text, photo, or video) to Facebook Page Graph API
   */
  async publishPost({ accessToken, platformAccountId, pageId, caption, content, mediaUrls = [], mediaType }) {
    const targetPageId = platformAccountId || pageId || 'me';
    const textMessage = caption || (typeof content === 'object' ? content?.FACEBOOK || content?.text || JSON.stringify(content) : content) || '';

    if (!accessToken || accessToken.startsWith('mock_')) {
      logger.info(`[FacebookAdapter SIMULATION] Post to Facebook Page "${targetPageId}": ${textMessage}`);
      const mockPostId = `fb_mock_post_${Date.now()}`;
      return {
        success: true,
        externalPostId: mockPostId,
        externalPostUrl: `https://facebook.com/${mockPostId}`,
        postId: mockPostId,
        postUrl: `https://facebook.com/${mockPostId}`,
      };
    }

    try {
      const mediaUrl = mediaUrls.length > 0 ? mediaUrls[0] : null;

      let response;

      if (mediaUrl) {
        const isVideo = mediaType === 'VIDEO' || mediaUrl.toLowerCase().endsWith('.mp4') || mediaUrl.includes('/video/upload/');

        if (isVideo) {
          // Video upload endpoint: POST /{page_id}/videos
          response = await axios.post(`${config.social.facebook.graphBaseUrl}/${targetPageId}/videos`, {
            file_url: mediaUrl,
            description: textMessage,
            access_token: accessToken,
          });
        } else {
          // Photo upload endpoint: POST /{page_id}/photos
          response = await axios.post(`${config.social.facebook.graphBaseUrl}/${targetPageId}/photos`, {
            url: mediaUrl,
            caption: textMessage,
            access_token: accessToken,
          });
        }
      } else {
        // Text post endpoint: POST /{page_id}/feed
        response = await axios.post(`${config.social.facebook.graphBaseUrl}/${targetPageId}/feed`, {
          message: textMessage,
          access_token: accessToken,
        });
      }

      const fbPostId = response.data?.id || response.data?.post_id;

      return {
        success: true,
        externalPostId: fbPostId,
        externalPostUrl: `https://facebook.com/${fbPostId}`,
        postId: fbPostId,
        postUrl: `https://facebook.com/${fbPostId}`,
      };
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message;
      logger.error(`[FacebookAdapter] Post publishing error: ${errMsg}`);
      throw new Error(`Facebook API Error: ${errMsg}`);
    }
  }

  async postContent(params) {
    return this.publishPost(params);
  }

  async getAccessToken() {
    return { accessToken: 'mock_fb_access_token' };
  }
}

export default FacebookAdapter;
