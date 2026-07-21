import { prisma } from '../config/db.js';
import config from '../config/env.js';
import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import LinkedinService from '../services/social/linkedinService.js';
import XService from '../services/social/xService.js';

/**
 * Controller: Generate OAuth authorization URLs for target social platforms.
 */
export const getOAuthUrl = catchAsync(async (req, res) => {
  const { platform } = req.query;
  const redirectUri = req.query.redirectUri || process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

  if (!platform) {
    throw ApiError.badRequest('Query parameter "platform" is required (INSTAGRAM, LINKEDIN, X).');
  }

  let url = '';
  const state = Buffer.from(JSON.stringify({ platform, timestamp: Date.now() })).toString('base64');

  switch (platform.toUpperCase()) {
    case 'LINKEDIN':
      const linkedinClientId = process.env.LINKEDIN_CLIENT_ID || 'mock_linkedin_client_id';
      url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedinClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=openid%20profile%20w_member_social`;
      break;

    case 'X':
    case 'TWITTER':
      const xClientId = process.env.X_CLIENT_ID || 'mock_x_client_id';
      url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${xClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
      break;

    case 'INSTAGRAM':
      const fbAppId = process.env.FACEBOOK_APP_ID || 'mock_fb_app_id';
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
    if (platformUpper === 'LINKEDIN' && process.env.LINKEDIN_CLIENT_ID) {
      const exchanged = await LinkedinService.getAccessToken({
        code,
        redirectUri,
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      });
      tokenData.accessToken = exchanged.accessToken;
    } else if (platformUpper === 'X' && process.env.X_CLIENT_ID) {
      const exchanged = await XService.exchangeToken({
        code,
        codeVerifier: codeVerifier || 'challenge',
        redirectUri,
        clientId: process.env.X_CLIENT_ID,
        clientSecret: process.env.X_CLIENT_SECRET,
      });
      tokenData.accessToken = exchanged.accessToken;
      tokenData.refreshToken = exchanged.refreshToken;
    }
  } catch (err) {
    logger.warn(`[AuthController] OAuth exchange fallback used: ${err.message}`);
  }

  // Ensure user exists
  await ensureDefaultUserExists(userId);

  const account = await prisma.socialAccount.upsert({
    where: {
      userId_platform_platformAccountId: {
        userId,
        platform: platformUpper,
        platformAccountId: tokenData.platformAccountId,
      },
    },
    update: {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresAt,
      isActive: true,
    },
    create: {
      userId,
      platform: platformUpper,
      platformAccountId: tokenData.platformAccountId,
      username: tokenData.username,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresAt,
      isActive: true,
    },
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

  await ensureDefaultUserExists(userId);

  const accountId = platformAccountId || `id_${platformLower(platformUpper)}_${Date.now()}`;

  const account = await prisma.socialAccount.upsert({
    where: {
      userId_platform_platformAccountId: {
        userId,
        platform: platformUpper,
        platformAccountId: accountId,
      },
    },
    update: {
      username,
      accessToken: accessToken || `mock_${platformLower(platformUpper)}_token`,
      isActive: true,
    },
    create: {
      userId,
      platform: platformUpper,
      platformAccountId: accountId,
      username,
      accountName: `@${username} (${platformUpper})`,
      accessToken: accessToken || `mock_${platformLower(platformUpper)}_token`,
      isActive: true,
    },
  });

  return successResponse(res, HttpStatus.CREATED, `Social account @${username} connected successfully.`, { account });
});

/**
 * Controller: Get connected social accounts.
 */
export const getUserAccounts = catchAsync(async (req, res) => {
  const { userId = 'default-user-id' } = req.query;

  const accounts = await prisma.socialAccount.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      platform: true,
      username: true,
      accountName: true,
      platformAccountId: true,
      expiresAt: true,
      createdAt: true,
    },
  });

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

  const account = await prisma.socialAccount.findUnique({ where: { id } });
  if (!account) {
    throw ApiError.notFound(`Social account with ID "${id}" not found.`);
  }

  const updatedAccount = await prisma.socialAccount.update({
    where: { id },
    data: { isActive: false },
  });

  return successResponse(res, HttpStatus.OK, 'Social account disconnected successfully.', { account: updatedAccount });
});

function platformLower(p) {
  return (p || '').toLowerCase();
}

async function ensureDefaultUserExists(userId) {
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `user_${userId}@socialautopilot.internal`,
        name: 'Demo Content Creator',
      },
    });
  } catch (err) {
    logger.warn(`DB User warning: ${err.message}`);
  }
}
