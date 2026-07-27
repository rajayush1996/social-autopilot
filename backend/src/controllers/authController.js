import config from '../config/env.js';
import { prisma } from '../config/db.js';
import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import SocialAdapterFactory from '../services/social/socialAdapterFactory.js';
import UserService from '../services/userService.js';
import SocialAccountService from '../services/socialAccountService.js';
import { emitAccountStatusChange } from '../services/socketService.js';
import { encrypt } from '../utils/encryption.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_sign_key_for_social_autopilot';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_for_social_autopilot';
const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || '3m';
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '1d';

/**
 * Controller: Generate OAuth authorization URLs for target social platforms.
 */
export const getOAuthUrl = catchAsync(async (req, res) => {
  const { platform } = req.query;
  const redirectUri = req.query.redirectUri || config.oauth.redirectUri;
  let userId = req.user?.id || req.query.userId;
  if (!userId || userId === 'default-user-id') {
    const latestUser = await prisma.user.findFirst({
      where: { id: { not: 'default-user-id' } },
      orderBy: { updatedAt: 'desc' },
    });
    userId = latestUser ? latestUser.id : 'default-user-id';
  }

  if (!platform) {
    throw ApiError.badRequest('Query parameter "platform" is required (INSTAGRAM, LINKEDIN, X).');
  }

  let url = '';
  const state = Buffer.from(JSON.stringify({ platform, userId, timestamp: Date.now() })).toString('base64');

  switch (platform.toUpperCase()) {
    case 'LINKEDIN':
      if (!config.social.linkedin.clientId) {
        throw ApiError.badRequest('LINKEDIN_CLIENT_ID is not configured in environment variables.');
      }
      const linkedinScope = config.social.linkedin.scope || 'openid profile w_member_social';
      url = `${config.social.linkedin.oauthBaseUrl}/authorization?response_type=code&client_id=${config.social.linkedin.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(linkedinScope)}`;
      break;

    case 'X':
    case 'TWITTER':
      const xClientId = config.social.x.clientId || 'mock_x_client_id';
      url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${xClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
      break;

    case 'INSTAGRAM':
      const fbAppId = config.social.instagram.appId || 'mock_fb_app_id';
      const instagramScope = config.social.instagram.scope || 'public_profile,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement';
      url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(instagramScope)}&state=${state}&response_type=code&auth_type=rerequest`;
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
 * Controller: Process OAuth authorization code callback via HTTP GET (direct browser redirect from social provider).
 */
export const handleOAuthCallbackGet = catchAsync(async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000/accounts';

  if (error) {
    logger.error(`[OAuth Callback GET] Provider error: ${error_description || error}`);
    return res.redirect(`${frontendUrl}?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}?error=${encodeURIComponent('No authorization code provided.')}`);
  }

  let platform = 'LINKEDIN';
  let userId = req.user?.id;

  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      if (decoded.platform) platform = decoded.platform.toUpperCase();
      if (decoded.userId && decoded.userId !== 'default-user-id') userId = decoded.userId;
    } catch (e) {
      logger.warn(`[OAuth Callback GET] State parse warning: ${e.message}`);
    }
  }

  if (!userId || userId === 'default-user-id') {
    const latestUser = await prisma.user.findFirst({
      where: { id: { not: 'default-user-id' } },
      orderBy: { updatedAt: 'desc' },
    });
    userId = latestUser ? latestUser.id : 'default-user-id';
  }

  const redirectUri = config.oauth.redirectUri;

  let tokenData = {
    accessToken: `mock_${platform.toLowerCase()}_token_${Date.now()}`,
    refreshToken: null,
    platformAccountId: `acc_${Date.now()}`,
    username: `user_${platform.toLowerCase()}`,
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  };

  try {
    const adapter = SocialAdapterFactory.getAdapter(platform);

    if (platform === 'LINKEDIN' && config.social.linkedin.clientId) {
      const exchanged = await adapter.exchangeToken({
        code,
        redirectUri,
        clientId: config.social.linkedin.clientId,
        clientSecret: config.social.linkedin.clientSecret,
      });
      tokenData.accessToken = exchanged.accessToken;
      tokenData.expiresAt = exchanged.expiresIn ? new Date(Date.now() + exchanged.expiresIn * 1000) : tokenData.expiresAt;
      if (exchanged.platformAccountId) tokenData.platformAccountId = exchanged.platformAccountId;
      if (exchanged.username) tokenData.username = exchanged.username;
    } else if (platform === 'INSTAGRAM') {
      const exchanged = await adapter.exchangeToken({
        code,
        redirectUri,
        appId: config.social.instagram.appId,
        appSecret: config.social.instagram.appSecret,
      });
      tokenData.accessToken = exchanged.accessToken;
      tokenData.expiresAt = exchanged.expiresIn ? new Date(Date.now() + exchanged.expiresIn * 1000) : tokenData.expiresAt;
      if (exchanged.platformAccountId) tokenData.platformAccountId = exchanged.platformAccountId;
      if (exchanged.username) tokenData.username = exchanged.username;
    }
  } catch (err) {
    logger.error(`[OAuth Callback GET] Token exchange error: ${err.message}`);
    return res.redirect(`${frontendUrl}?error=${encodeURIComponent(err.response?.data?.error_description || err.response?.data?.message || err.message)}`);
  }

  await UserService.ensureUserExists(userId);

  await SocialAccountService.upsertAccount({
    userId,
    platform,
    platformAccountId: tokenData.platformAccountId,
    username: tokenData.username,
    accessToken: encrypt(tokenData.accessToken),
    refreshToken: tokenData.refreshToken ? encrypt(tokenData.refreshToken) : null,
    expiresAt: tokenData.expiresAt,
  });

  emitAccountStatusChange({ userId, platform, action: 'CONNECTED' });

  return res.redirect(`${frontendUrl}?connected=${platform}`);
});

/**
 * Controller: Process OAuth authorization code callback via HTTP POST.
 */
export const handleOAuthCallback = catchAsync(async (req, res) => {
  const { code, platform, codeVerifier, redirectUri } = req.body;
  const userId = req.user?.id || req.body.userId || 'default-user-id';

  if (!code || !platform) {
    throw ApiError.badRequest('Fields "code" and "platform" are required.');
  }

  const platformUpper = platform.toUpperCase();
  const platformLower = (p) => p.toLowerCase();
  let tokenData = {
    accessToken: `mock_${platformLower(platformUpper)}_token_${Date.now()}`,
    refreshToken: `mock_${platformLower(platformUpper)}_refresh_${Date.now()}`,
    platformAccountId: `acc_${Date.now()}`,
    username: `user_${platformLower(platformUpper)}`,
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
      if (exchanged.platformAccountId) tokenData.platformAccountId = exchanged.platformAccountId;
      if (exchanged.username) tokenData.username = exchanged.username;
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

  // Link account using SocialAccountService (Encrypting sensitive tokens)
  const account = await SocialAccountService.upsertAccount({
    userId,
    platform: platformUpper,
    platformAccountId: tokenData.platformAccountId,
    username: tokenData.username,
    accessToken: encrypt(tokenData.accessToken),
    refreshToken: encrypt(tokenData.refreshToken),
    expiresAt: tokenData.expiresAt,
  });

  emitAccountStatusChange({ userId, platform: platformUpper, action: 'CONNECTED' });

  return successResponse(res, HttpStatus.OK, `${platformUpper} social account connected.`, { account });
});

/**
 * Controller: Connect mock social account (Simulation mode).
 */
export const connectMockAccount = catchAsync(async (req, res) => {
  const { platform, platformAccountId, username = 'mock_user', accessToken } = req.body;
  const userId = req.user?.id || req.body.userId || 'default-user-id';
  const platformLower = (p) => p.toLowerCase();

  if (!platform) {
    throw ApiError.badRequest('Field "platform" is required.');
  }

  const platformUpper = platform.toUpperCase();

  await UserService.ensureUserExists(userId);

  const accountId = platformAccountId || `id_${platformLower(platformUpper)}_${Date.now()}`;

  const account = await SocialAccountService.upsertAccount({
    userId,
    platform: platformUpper,
    platformAccountId: accountId,
    username,
    accessToken: encrypt(accessToken || `mock_${platformLower(platformUpper)}_token`),
    refreshToken: null,
    expiresAt: null,
  });

  emitAccountStatusChange({ userId, platform: platformUpper, action: 'CONNECTED' });

  return successResponse(res, HttpStatus.CREATED, `Social account @${username} connected successfully.`, { account });
});

export const connectAccount = connectMockAccount;

/**
 * Controller: Get connected social accounts.
 */
export const getUserAccounts = catchAsync(async (req, res) => {
  const userId = req.user?.id || (req.query.userId && req.query.userId !== 'me' ? req.query.userId : 'default-user-id');

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
  const userId = req.user?.id || req.body?.userId || 'default-user-id';

  let account = null;
  try {
    account = await SocialAccountService.findAccountById(id);
  } catch (err) {
    account = null;
  }

  if (!account) {
    const platformUpper = id.toUpperCase();
    account = await prisma.socialAccount.findFirst({
      where: {
        userId,
        platform: platformUpper,
        isActive: true,
      },
    });
  }

  if (!account) {
    throw ApiError.notFound(`Social account with ID or platform "${id}" not found.`);
  }

  const updatedAccount = await SocialAccountService.disconnectAccount(account.id);

  emitAccountStatusChange({
    userId: account.userId,
    platform: account.platform.toUpperCase(),
    action: 'DISCONNECTED',
  });

  return successResponse(res, HttpStatus.OK, 'Social account disconnected successfully.', { account: updatedAccount });
});

/**
 * Controller: Get User profile (plan, credits, settings)
 */
export const getUserProfile = catchAsync(async (req, res) => {
  const id = req.params.id === 'me' ? (req.user?.id || 'default-user-id') : req.params.id;

  const user = await UserService.ensureUserExists(id);

  return successResponse(res, HttpStatus.OK, 'User profile retrieved successfully.', { user });
});

/**
 * Controller: Update User plan (FREE vs PREMIUM mock upgrades)
 */
export const updateUserPlan = catchAsync(async (req, res) => {
  const id = req.params.id === 'me' ? (req.user?.id || 'default-user-id') : req.params.id;
  const { plan } = req.body;

  if (!plan || !['FREE', 'PREMIUM'].includes(plan.toUpperCase())) {
    throw ApiError.badRequest('Field "plan" must be FREE or PREMIUM.');
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { plan: plan.toUpperCase() },
  });

  return successResponse(res, HttpStatus.OK, `User plan updated to ${plan.toUpperCase()} successfully.`, { user: updatedUser });
});

/**
 * Controller: Update User role (Strictly Super Admin guarded)
 */
export const updateUserRole = catchAsync(async (req, res) => {
  const currentRole = req.user?.role?.toUpperCase();
  if (currentRole !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('Access Denied: Only Super Admin can modify user roles.');
  }

  const id = req.params.id === 'me' ? req.user?.id : req.params.id;
  const { role } = req.body;

  if (!role || !['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role.toUpperCase())) {
    throw ApiError.badRequest('Field "role" must be USER, ADMIN, or SUPER_ADMIN.');
  }

  const updatedUser = await UserService.updateUserRole(id, role.toUpperCase());

  return successResponse(res, HttpStatus.OK, `User role updated to ${role.toUpperCase()} successfully.`, { user: updatedUser });
});

/**
 * Controller: Register a new user (All new sign-ups strictly default to 'USER').
 */
export const register = catchAsync(async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    throw ApiError.badRequest('Fields "email", "password", and "name" are required.');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw ApiError.badRequest('An account with this email is already registered.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const uniqueId = `USR-${Math.floor(100000 + Math.random() * 900000)}`;

  // Super Admin role is strictly reserved for the owner email (ayushraj8571@gmail.com).
  // All other accounts strictly default to 'USER'.
  const assignedRole = email.toLowerCase() === 'ayushraj8571@gmail.com' ? 'SUPER_ADMIN' : 'USER';

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      uniqueId,
      name,
      password: hashedPassword,
      aiCredits: 15,
      plan: 'FREE',
      role: assignedRole,
      emailVerified: false,
      verificationToken,
    },
  });

  // Mock-send verification email via console logging for developers
  const verificationLink = `${req.protocol}://${req.get('host') || 'localhost:5000'}/api/auth/verify-email?token=${verificationToken}`;
  logger.info(`
  ==================================================================
  📧 [MOCK EMAIL SERVICE] SENDING VERIFICATION EMAIL
  To: ${email}
  Subject: Verify your Social Autopilot Account
  
  Welcome to Social Autopilot! Please confirm your email address by clicking the link below:
  ${verificationLink}
  ==================================================================
  `);

  delete user.password;

  return successResponse(res, HttpStatus.CREATED, 'Account registered successfully. A verification link has been sent to your email.', { user });
});

/**
 * Controller: Authenticate user credentials and return JWT token.
 */
export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest('Fields "email" and "password" are required.');
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || !user.password) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  if (!user.emailVerified) {
    throw ApiError.forbidden('Please verify your email address before logging in. A verification link has been sent to your email.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRATION }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRATION }
  );

  delete user.password;

  return successResponse(res, HttpStatus.OK, 'Authenticated successfully.', { token, refreshToken, user });
});

/**
 * Controller: Refresh expired short-lived JWT access token using valid refresh token.
 */
export const refreshAccessToken = catchAsync(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];

  if (!refreshToken) {
    throw ApiError.badRequest('Field "refreshToken" is required.');
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      throw ApiError.unauthorized('Invalid refresh token token type.');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw ApiError.unauthorized('User not found.');
    }

    const newToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRATION }
    );

    const newRefreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRATION }
    );

    return successResponse(res, HttpStatus.OK, 'Token refreshed successfully.', {
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    throw ApiError.unauthorized('Refresh token expired or invalid. Please sign in again.');
  }
});

/**
 * Controller: Retrieve current authenticated user profile.
 */
export const getMe = catchAsync(async (req, res) => {
  const userId = req.user.id;

  let user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw ApiError.notFound('User profile not found.');
  }

  // Auto-assign unique public ID if not present
  if (!user.uniqueId) {
    const generatedTag = `USR-${Math.floor(100000 + Math.random() * 900000)}`;
    user = await prisma.user.update({
      where: { id: userId },
      data: { uniqueId: generatedTag },
    });
  }

  delete user.password;

  return successResponse(res, HttpStatus.OK, 'Profile retrieved successfully.', { user });
});

/**
 * Controller: Update user profile details (avatar, bio, phone number, date of birth).
 */
export const updateUserProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { name, phoneNumber, bio, dateOfBirth, avatarUrl } = req.body;

  let parsedDob = undefined;
  if (dateOfBirth) {
    parsedDob = new Date(dateOfBirth);
    if (isNaN(parsedDob.getTime())) {
      parsedDob = undefined;
    }
  }

  let user = await prisma.user.findUnique({ where: { id: userId } });
  let uniqueId = user?.uniqueId;
  if (!uniqueId) {
    uniqueId = `USR-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name }),
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(bio !== undefined && { bio }),
      ...(parsedDob && { dateOfBirth: parsedDob }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      uniqueId,
    },
  });

  delete updatedUser.password;

  return successResponse(res, HttpStatus.OK, 'Profile updated successfully.', { user: updatedUser });
});

/**
 * Controller: Verify User email address by matching verification token.
 */
export const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw ApiError.badRequest('Verification token is missing.');
  }

  const user = await prisma.user.findFirst({
    where: { verificationToken: token },
  });

  if (!user) {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Failed - Social Autopilot</title>
        <style>
          body {
            background-color: #0b0f19;
            color: #f1f5f9;
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
          }
          .card {
            background: rgba(17, 24, 39, 0.4);
            border: 1px solid rgba(225, 29, 72, 0.3);
            padding: 2.5rem;
            border-radius: 1.5rem;
            text-align: center;
            max-width: 400px;
            backdrop-filter: blur(12px);
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
          }
          h1 {
            color: #f43f5e;
            margin-top: 0;
            font-size: 1.5rem;
          }
          p {
            color: #94a3b8;
            font-size: 0.875rem;
            line-height: 1.5;
          }
          .btn {
            display: inline-block;
            margin-top: 1.5rem;
            background: #334155;
            color: #f1f5f9;
            padding: 0.625rem 1.25rem;
            border-radius: 0.75rem;
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: bold;
            transition: background 0.2s;
          }
          .btn:hover {
            background: #475569;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Verification Failed</h1>
          <p>The verification link is invalid, expired, or has already been used. Please try registering again or contact support.</p>
          <a href="http://localhost:3000/signup" class="btn">Back to Registration</a>
        </div>
      </body>
      </html>
    `);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
    },
  });

  res.setHeader('Content-Type', 'text/html');
  return res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Email Verified - Social Autopilot</title>
      <style>
        body {
          background-color: #0b0f19;
          color: #f1f5f9;
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
        }
        .card {
          background: rgba(17, 24, 39, 0.4);
          border: 1px solid rgba(30, 41, 59, 0.8);
          padding: 2.5rem;
          border-radius: 1.5rem;
          text-align: center;
          max-width: 400px;
          backdrop-filter: blur(12px);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
        }
        h1 {
          color: #818cf8;
          margin-top: 0;
          font-size: 1.5rem;
        }
        p {
          color: #94a3b8;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .btn {
          display: inline-block;
          margin-top: 1.5rem;
          background: #4f46e5;
          color: white;
          padding: 0.625rem 1.25rem;
          border-radius: 0.75rem;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: bold;
          transition: background 0.2s;
        }
        .btn:hover {
          background: #4338ca;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Email Confirmed!</h1>
        <p>Your email address has been verified successfully. You can now log into your Social Autopilot portal and start scheduling posts.</p>
        <a href="http://localhost:3000/login" class="btn">Proceed to Sign In</a>
      </div>
    </body>
    </html>
  `);
});

function platformLower(p) {
  return (p || '').toLowerCase();
}
