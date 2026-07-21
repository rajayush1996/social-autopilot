import config from '../config/env.js';
import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import SocialAdapterFactory from '../services/social/socialAdapterFactory.js';
import UserService from '../services/userService.js';
import SocialAccountService from '../services/socialAccountService.js';

/**
 * Controller: Generate OAuth authorization URLs for target social platforms.
 */
export const getOAuthUrl = catchAsync(async (req, res) => {
  const { platform } = req.query;
  const redirectUri = req.query.redirectUri || config.oauth.redirectUri;

  if (!platform) {
    throw ApiError.badRequest('Query parameter "platform" is required (INSTAGRAM, LINKEDIN, X).');
  }

  let url = '';
  const state = Buffer.from(JSON.stringify({ platform, timestamp: Date.now() })).toString('base64');

  switch (platform.toUpperCase()) {
    case 'LINKEDIN':
      const linkedinClientId = config.social.linkedin.clientId || 'mock_linkedin_client_id';
      url = `${config.social.linkedin.oauthBaseUrl}/authorization?response_type=code&client_id=${linkedinClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=openid%20profile%20w_member_social`;
      break;

    case 'X':
    case 'TWITTER':
      const xClientId = config.social.x.clientId || 'mock_x_client_id';
      url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${xClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
      break;

    case 'INSTAGRAM':
      const fbAppId = config.social.instagram.appId || 'mock_fb_app_id';
      url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_content_publish,pages_show_list&state=${state}`;
      break;

    default:
      throw ApiError.badRequest('Unsupported platform. Allowed values: INSTAGRAM, LINKEDIN, X');
  }

  return successResponse(res, HttpStatus.OK, `OAuth URL generated for ${platform.toUpperCase()}`, {
    platform: platform.toUpperCase(),
    authUrl: url,
    redirectUri,
  });
});

/**
 * Controller: Process OAuth authorization code callback.
 */
export const handleOAuthCallback = catchAsync(async (req, res) => {
  const { code, platform, userId = 'default-user-id', codeVerifier, redirectUri } = req.body;

  if (!code || !platform) {
    throw ApiError.badRequest('Fields "code" and "platform" are required.');
  }

  const platformUpper = platform.toUpperCase();
  let tokenData = {
    accessToken: `mock_${platformLower(platform)}_token_${Date.now()}`,
    refreshToken: `mock_${platformLower(platform)}_refresh_${Date.now()}`,
    platformAccountId: `acc_${Date.now()}`,
    username: `user_${platformLower(platform)}`,
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  };

  try {
    const adapter = SocialAdapterFactory.getAdapter(platformUpper);
    let exchanged = null;

    if (platformUpper === 'LINKEDIN' && config.social.linkedin.clientId) {
      exchanged = await adapter.exchangeToken({
        code,
        redirectUri,
        clientId: config.social.linkedin.clientId,
        clientSecret: config.social.linkedin.clientSecret,
      });
      tokenData.accessToken = exchanged.accessToken;
      tokenData.expiresAt = exchanged.expiresIn ? new Date(Date.now() + exchanged.expiresIn * 1000) : tokenData.expiresAt;
    } else if (platformUpper === 'X' && config.social.x.clientId) {
      exchanged = await adapter.exchangeToken({
        code,
        codeVerifier: codeVerifier || 'challenge',
        redirectUri,
        clientId: config.social.x.clientId,
        clientSecret: config.social.x.clientSecret,
      });
      tokenData.accessToken = exchanged.accessToken;
      tokenData.refreshToken = exchanged.refreshToken;
      tokenData.expiresAt = exchanged.expiresIn ? new Date(Date.now() + exchanged.expiresIn * 1000) : tokenData.expiresAt;
    }
  } catch (err) {
    logger.warn(`[AuthController] OAuth exchange fallback used: ${err.message}`);
  }

  // Ensure user exists (Service pattern)
  await UserService.ensureUserExists(userId);

  // Link account using SocialAccountService
  const account = await SocialAccountService.upsertAccount({
    userId,
    platform: platformUpper,
    platformAccountId: tokenData.platformAccountId,
    username: tokenData.username,
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    expiresAt: tokenData.expiresAt,
  });

  return successResponse(res, HttpStatus.OK, `${platformUpper} social account connected.`, { account });
});

/**
 * Controller: Directly connect or mock-link a social account (for testing & development).
 */
export const connectAccount = catchAsync(async (req, res) => {
  const { userId = 'default-user-id', platform, username, accessToken, platformAccountId } = req.body;

  if (!platform || !username) {
    throw ApiError.badRequest('Fields "platform" and "username" are required.');
  }

  const platformUpper = platform.toUpperCase();
  if (!['INSTAGRAM', 'LINKEDIN', 'X'].includes(platformUpper)) {
    throw ApiError.badRequest('Invalid platform. Must be INSTAGRAM, LINKEDIN, or X.');
  }

  // Ensure user exists (Service pattern)
  await UserService.ensureUserExists(userId);

  const accountId = platformAccountId || `id_${platformLower(platformUpper)}_${Date.now()}`;

  const account = await SocialAccountService.upsertAccount({
    userId,
    platform: platformUpper,
    platformAccountId: accountId,
    username,
    accessToken: accessToken || `mock_${platformLower(platformUpper)}_token`,
    refreshToken: null,
    expiresAt: null,
  });

  return successResponse(res, HttpStatus.CREATED, `Social account @${username} connected successfully.`, { account });
});

/**
 * Controller: Get connected social accounts.
 */
export const getUserAccounts = catchAsync(async (req, res) => {
  const { userId = 'default-user-id' } = req.query;

  const accounts = await SocialAccountService.findActiveAccountsByUserId(userId);

  return successResponse(res, HttpStatus.OK, 'Social accounts retrieved successfully.', {
    count: accounts.length,
    accounts,
  });
});

/**
 * Controller: Disconnect a social account.
 */
export const disconnectAccount = catchAsync(async (req, res) => {
  const { id } = req.params;

  const account = await SocialAccountService.findAccountById(id);
  if (!account) {
    throw ApiError.notFound(`Social account with ID "${id}" not found.`);
  }

  const updatedAccount = await SocialAccountService.disconnectAccount(id);

  return successResponse(res, HttpStatus.OK, 'Social account disconnected successfully.', { account: updatedAccount });
});

function platformLower(p) {
  return (p || '').toLowerCase();
}
