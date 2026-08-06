import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/db.js';
import config from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { HttpStatus } from '../utils/httpStatus.js';
import logger from '../utils/logger.js';
import UserService from './userService.js';
import SocialAccountService from './socialAccountService.js';
import SocialAdapterFactory from './social/socialAdapterFactory.js';
import { emitAccountStatusChange } from './socketService.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const JWT_SECRET = config.jwt.secret;
const JWT_REFRESH_SECRET = config.jwt.refreshSecret;
const JWT_ACCESS_EXPIRATION = config.jwt.accessExpiration;
const JWT_REFRESH_EXPIRATION = config.jwt.refreshExpiration;

/**
 * AuthService (Single Responsibility: All Authentication, JWT Token Management, & OAuth Flow Business Logic)
 */
export class AuthService {
  /**
   * Generate OAuth Authorization URL for target social platform.
   */
  static async getOAuthUrl({ platform, redirectUriInput, userIdInput }) {
    if (!platform) {
      throw ApiError.badRequest('Query parameter "platform" is required (INSTAGRAM, LINKEDIN, X, FACEBOOK).');
    }

    const redirectUri = redirectUriInput || config.oauth.redirectUri;
    let userId = userIdInput;

    if (!userId || userId === 'default-user-id') {
      const latestUser = await UserService.getLatestUser();
      userId = latestUser ? latestUser.id : 'default-user-id';
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
        const xCodeVerifier = crypto.randomBytes(32).toString('base64url');
        const xCodeChallenge = crypto
          .createHash('sha256')
          .update(xCodeVerifier)
          .digest('base64url');

        const xStatePayload = JSON.stringify({
          platform: 'X',
          userId,
          codeVerifier: xCodeVerifier,
          timestamp: Date.now(),
        });
        const xState = Buffer.from(xStatePayload).toString('base64url');
        const xScope = 'tweet.read%20tweet.write%20users.read%20offline.access';
        url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${xClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${xScope}&state=${xState}&code_challenge=${xCodeChallenge}&code_challenge_method=S256`;
        break;

      case 'INSTAGRAM':
        const fbAppId = config.social.instagram.appId || 'mock_fb_app_id';
        const instagramScope = config.social.instagram.scope || 'public_profile,instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement';
        url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(instagramScope)}&state=${state}&response_type=code&auth_type=rerequest`;
        break;

      case 'FACEBOOK':
        const facebookAppId = config.social.facebook.appId || 'mock_fb_app_id';
        const facebookScope = config.social.facebook.scope || 'pages_manage_posts,pages_read_engagement,pages_show_list,public_profile';
        url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(facebookScope)}&state=${state}&response_type=code&auth_type=rerequest`;
        break;

      default:
        throw ApiError.badRequest('Unsupported platform. Allowed values: INSTAGRAM, LINKEDIN, X, FACEBOOK');
    }

    return {
      platform: platform.toUpperCase(),
      authUrl: url,
      redirectUri,
    };
  }

  /**
   * Process OAuth callback code via GET request (Browser redirect).
   */
  static async handleOAuthCallbackGet({ code, state, error, error_description }) {
    const frontendUrl = `${config.frontendUrl}/accounts`;

    if (error) {
      logger.error(`[OAuth Callback GET] Provider error: ${error_description || error}`);
      return `${frontendUrl}?error=${encodeURIComponent(error_description || error)}`;
    }

    if (!code) {
      return `${frontendUrl}?error=${encodeURIComponent('No authorization code provided.')}`;
    }

    let platform = 'LINKEDIN';
    let userId = null;
    let codeVerifier = 'challenge';

    if (state) {
      try {
        let decodedStr = '';
        try {
          decodedStr = Buffer.from(state, 'base64url').toString('utf8');
        } catch (e) {
          decodedStr = Buffer.from(state, 'base64').toString('utf8');
        }
        const decoded = JSON.parse(decodedStr);
        if (decoded.platform) platform = decoded.platform.toUpperCase();
        if (decoded.userId && decoded.userId !== 'default-user-id') userId = decoded.userId;
        if (decoded.codeVerifier) codeVerifier = decoded.codeVerifier;
      } catch (e) {
        logger.warn(`[OAuth Callback GET] State parse warning: ${e.message}`);
      }
    }

    if (!userId || userId === 'default-user-id') {
      const latestUser = await UserService.getLatestUser();
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
        if (exchanged.accounts) tokenData.accounts = exchanged.accounts;
        if (exchanged.platformAccountId) tokenData.platformAccountId = exchanged.platformAccountId;
        if (exchanged.username) tokenData.username = exchanged.username;
        if (exchanged.accountType) tokenData.accountType = exchanged.accountType;
        if (exchanged.avatarUrl) tokenData.avatarUrl = exchanged.avatarUrl;
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
      } else if (platform === 'X' && config.social.x.clientId) {
        const exchanged = await adapter.exchangeToken({
          code,
          codeVerifier: codeVerifier || 'challenge',
          redirectUri,
          clientId: config.social.x.clientId,
          clientSecret: config.social.x.clientSecret,
        });
        tokenData.accessToken = exchanged.accessToken;
        if (exchanged.refreshToken) tokenData.refreshToken = exchanged.refreshToken;
        tokenData.expiresAt = exchanged.expiresIn ? new Date(Date.now() + exchanged.expiresIn * 1000) : tokenData.expiresAt;
        if (exchanged.platformAccountId) tokenData.platformAccountId = exchanged.platformAccountId;
        if (exchanged.username) tokenData.username = exchanged.username;
        tokenData.isPremium = Boolean(exchanged.isPremium);
      } else if (platform === 'FACEBOOK') {
        const exchanged = await adapter.exchangeToken({
          code,
          redirectUri,
          appId: config.social.facebook.appId,
          appSecret: config.social.facebook.appSecret,
        });
        tokenData.accessToken = exchanged.accessToken;
        if (exchanged.refreshToken) tokenData.refreshToken = exchanged.refreshToken;
        tokenData.expiresAt = exchanged.expiresIn ? new Date(Date.now() + exchanged.expiresIn * 1000) : tokenData.expiresAt;
        if (exchanged.platformAccountId) tokenData.platformAccountId = exchanged.platformAccountId;
        if (exchanged.username) tokenData.username = exchanged.username;
      }
    } catch (err) {
      logger.error(`[OAuth Callback GET] Token exchange error: ${err.message}`);
      return `${frontendUrl}?error=${encodeURIComponent(err.response?.data?.error_description || err.response?.data?.message || err.message)}`;
    }

    await UserService.ensureUserExists(userId);

    const accountsToSave = Array.isArray(tokenData.accounts) && tokenData.accounts.length > 0
      ? tokenData.accounts.map((acc) => ({
          userId,
          platform,
          platformAccountId: acc.platformAccountId,
          username: acc.username,
          accountType: acc.accountType || 'PERSONAL',
          avatarUrl: acc.avatarUrl || null,
          accessToken: encrypt(tokenData.accessToken),
          refreshToken: tokenData.refreshToken ? encrypt(tokenData.refreshToken) : null,
          expiresAt: tokenData.expiresAt,
          isPremium: tokenData.isPremium || false,
        }))
      : [{
          userId,
          platform,
          platformAccountId: tokenData.platformAccountId,
          username: tokenData.username,
          accountType: tokenData.accountType || 'PERSONAL',
          avatarUrl: tokenData.avatarUrl || null,
          accessToken: encrypt(tokenData.accessToken),
          refreshToken: tokenData.refreshToken ? encrypt(tokenData.refreshToken) : null,
          expiresAt: tokenData.expiresAt,
          isPremium: tokenData.isPremium || false,
        }];

    for (const accPayload of accountsToSave) {
      await SocialAccountService.upsertAccount(accPayload);
    }

    emitAccountStatusChange({ userId, platform, action: 'CONNECTED' });

    return `${frontendUrl}?connected=${platform}`;
  }

  /**
   * Process OAuth callback code via POST.
   */
  static async handleOAuthCallback({ code, platform, codeVerifier, redirectUri, userIdInput }) {
    if (!code || !platform) {
      throw ApiError.badRequest('Fields "code" and "platform" are required.');
    }

    const userId = userIdInput || 'default-user-id';
    const platformUpper = platform.toUpperCase();

    let tokenData = {
      accessToken: `mock_${platform.toLowerCase()}_token_${Date.now()}`,
      refreshToken: `mock_${platform.toLowerCase()}_refresh_${Date.now()}`,
      platformAccountId: `acc_${Date.now()}`,
      username: `user_${platform.toLowerCase()}`,
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
      logger.warn(`[AuthService] OAuth exchange fallback used: ${err.message}`);
    }

    await UserService.ensureUserExists(userId);

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

    return account;
  }

  /**
   * Connect mock social account for simulation.
   */
  static async connectMockAccount({ userIdInput, platform, platformAccountId, username = 'mock_user', accountType = 'PERSONAL', avatarUrl = null, accessToken, forceOverride = false }) {
    if (!platform) {
      throw ApiError.badRequest('Field "platform" is required.');
    }

    const userId = userIdInput || 'default-user-id';
    const platformUpper = platform.toUpperCase();
    const platformLower = platform.toLowerCase();

    await UserService.ensureUserExists(userId);

    // Production Safety Guard: If user has an active REAL Meta/LinkedIn OAuth account, do NOT overwrite it in mock testing unless forceOverride is explicitly true!
    if (!forceOverride) {
      const existingAccount = await prisma.socialAccount.findFirst({
        where: { userId, platform: platformUpper, isActive: true }
      });
      if (existingAccount && existingAccount.accessToken) {
        let decToken = '';
        try {
          decToken = decrypt(existingAccount.accessToken);
        } catch (e) {
          decToken = existingAccount.accessToken || '';
        }
        if (decToken.startsWith('EAA') || decToken.startsWith('AQ') || existingAccount.accountType === 'BUSINESS') {
          logger.info(`[connectMockAccount] Safety Guard: Active Real OAuth account exists for ${platformUpper}. Preserving production credentials.`);
          return existingAccount;
        }
      }
    }

    const accountId = platformAccountId || (accountType === 'ORGANIZATION' ? `urn:li:organization:mock_${Date.now()}` : `id_${platformLower}_${Date.now()}`);

    const account = await SocialAccountService.upsertAccount({
      userId,
      platform: platformUpper,
      platformAccountId: accountId,
      username,
      accountType,
      avatarUrl,
      accessToken: encrypt(accessToken || `mock_${platformLower}_token`),
      refreshToken: null,
      expiresAt: null,
    });

    emitAccountStatusChange({ userId, platform: platformUpper, action: 'CONNECTED' });

    return account;
  }

  /**
   * Register a new user account.
   */
  static async register({ email, password, name, hostHeader, protocol }) {
    if (!email || !password || !name) {
      throw ApiError.badRequest('Fields "email", "password", and "name" are required.');
    }

    const existingUser = await UserService.findUserByEmail(email);
    if (existingUser) {
      throw ApiError.badRequest('An account with this email is already registered.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const uniqueId = `USR-${Math.floor(100000 + Math.random() * 900000)}`;

    const assignedRole = email.toLowerCase() === 'ayushraj8571@gmail.com' ? 'SUPER_ADMIN' : 'USER';

    const user = await UserService.createUser({
      email: email.toLowerCase(),
      uniqueId,
      name,
      password: hashedPassword,
      aiCredits: 15,
      plan: 'FREE',
      role: assignedRole,
      emailVerified: false,
      verificationToken,
    });

    const verificationLink = `${protocol}://${hostHeader || 'localhost:5000'}/api/auth/verify-email?token=${verificationToken}`;
    logger.info(`
    ==================================================================
    📧 [MOCK EMAIL SERVICE] SENDING VERIFICATION EMAIL
    To: ${email}
    Subject: Verify your OmniSync Account
    
    Welcome to OmniSync! Please confirm your email address by clicking the link below:
    ${verificationLink}
    ==================================================================
    `);

    delete user.password;
    return user;
  }

  /**
   * Authenticate user credentials and return JWT tokens.
   */
  static async login({ email, password }) {
    if (!email || !password) {
      throw ApiError.badRequest('Fields "email" and "password" are required.');
    }

    const user = await UserService.findUserByEmail(email);

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

    return { token, refreshToken, user };
  }

  /**
   * Refresh access token using refresh token.
   */
  static async refreshAccessToken(refreshTokenInput) {
    if (!refreshTokenInput) {
      throw ApiError.badRequest('Field "refreshToken" is required.');
    }

    try {
      const decoded = jwt.verify(refreshTokenInput, JWT_REFRESH_SECRET);
      if (decoded.type !== 'refresh') {
        throw ApiError.unauthorized('Invalid refresh token type.');
      }

      const user = await UserService.findUserById(decoded.id);
      if (!user) {
        throw ApiError.unauthorized('User not found.');
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

      return { token, refreshToken };
    } catch (err) {
      throw ApiError.unauthorized('Refresh token expired or invalid. Please sign in again.');
    }
  }

  /**
   * Retrieve current user profile with allowed platforms matrix (Cached via UserService.findUserById).
   */
  static async getMe(userId) {
    let user = await UserService.findUserById(userId);

    if (!user) {
      throw ApiError.notFound('User profile not found.');
    }

    if (!user.uniqueId) {
      const generatedTag = `USR-${Math.floor(100000 + Math.random() * 900000)}`;
      user = await UserService.updateUserProfile(userId, { uniqueId: generatedTag });
    }

    delete user.password;

    const isSuperAdmin = user.role?.toUpperCase() === 'SUPER_ADMIN';
    let allowedPlatforms = ['INSTAGRAM', 'LINKEDIN', 'X', 'FACEBOOK'];

    if (!isSuperAdmin) {
      try {
        const setting = await prisma.systemSetting.findUnique({
          where: { key: 'PLAN_FEATURES_MATRIX' },
        });

        const userPlan = (user.plan || 'FREE').toUpperCase();
        const matrix = setting?.value || {
          FREE: { allowedPlatforms: ['INSTAGRAM', 'LINKEDIN', 'FACEBOOK'] },
          PRO: { allowedPlatforms: ['INSTAGRAM', 'LINKEDIN', 'X', 'FACEBOOK'] },
          ENTERPRISE: { allowedPlatforms: ['INSTAGRAM', 'LINKEDIN', 'X', 'FACEBOOK'] },
        };

        if (matrix[userPlan]?.allowedPlatforms) {
          allowedPlatforms = matrix[userPlan].allowedPlatforms;
        }
      } catch (e) {
        allowedPlatforms = ['INSTAGRAM', 'LINKEDIN', 'X', 'FACEBOOK'];
      }
    }

    return {
      ...user,
      allowedPlatforms,
    };
  }
}

export default AuthService;
