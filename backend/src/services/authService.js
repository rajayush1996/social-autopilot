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
import emailService from './emailService.js';
import { ACTIVE_LIVE_PLATFORMS, SUPER_ADMIN_PLATFORMS } from '../config/constants.js';

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
    const expiresAt = Date.now() + 2 * 60 * 1000; // Strictly 2 minutes from now
    const verificationToken = `${crypto.randomBytes(32).toString('hex')}_${expiresAt}`;
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
    logger.info(`[AuthService] 📧 Registration verification link generated for ${email}: ${verificationLink}`);
    
    // Deliver real verification email asynchronously in background with Ultra-Clean Light Theme
    emailService.sendEmail({
      to: email,
      subject: 'Verify your OmniSync Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your OmniSync Account</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#0f172a;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding:36px 16px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:24px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.04);">
                  <!-- Top Electric Blue Accent Bar -->
                  <tr>
                    <td height="6" style="background:linear-gradient(90deg, #2563EB, #0ea5e9);"></td>
                  </tr>
                  <!-- Main Body -->
                  <tr>
                    <td style="padding:36px 32px 32px 32px;">
                      <!-- Brand Logo Header -->
                      <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                        <tr>
                          <td width="42" height="42" align="center" valign="middle" style="background:linear-gradient(135deg, #2563EB, #0ea5e9); border-radius:12px; color:#ffffff; font-size:20px; font-weight:bold;">
                            ⚡
                          </td>
                          <td style="padding-left:12px;">
                            <span style="font-size:18px; font-weight:800; color:#0f172a; letter-spacing:-0.5px;">OmniSync</span><br/>
                            <span style="font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Social AutoPilot</span>
                          </td>
                        </tr>
                      </table>

                      <h1 style="font-size:22px; font-weight:800; color:#0f172a; margin:0 0 10px 0; line-height:1.3; letter-spacing:-0.4px;">
                        Verify your email address
                      </h1>
                      <p style="font-size:14px; line-height:1.6; color:#475569; margin:0 0 20px 0;">
                        Hi <strong>${name || 'Creator'}</strong>, thanks for joining OmniSync! Please confirm your email address to activate your autonomous workspace:
                      </p>

                      <!-- 2-Minute Expiration Security Pill -->
                      <div style="background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:14px; padding:12px 16px; margin-bottom:24px;">
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td valign="top" style="font-size:16px; padding-right:10px;">⏱️</td>
                            <td style="font-size:13px; color:#1e40af; line-height:1.5; font-weight:500;">
                              <strong style="font-weight:700;">Security Notice:</strong> This verification link is valid for <strong>2 minutes</strong>. If it expires, you can request a new link directly from the app.
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Primary CTA Button -->
                      <div style="text-align:center; margin:28px 0;">
                        <a href="${verificationLink}" style="background:linear-gradient(135deg, #2563EB, #1d4ed8); color:#ffffff; font-size:14px; font-weight:700; text-decoration:none; padding:14px 34px; border-radius:12px; display:inline-block; box-shadow:0 4px 14px rgba(37,99,235,0.25);">
                          Verify Email Address →
                        </a>
                      </div>

                      <p style="font-size:12px; color:#64748b; line-height:1.6; margin:24px 0 0 0; word-break:break-all;">
                        Or copy and paste this URL into your browser:<br/>
                        <a href="${verificationLink}" style="color:#2563EB; text-decoration:underline;">${verificationLink}</a>
                      </p>
                    </td>
                  </tr>
                  <!-- Clean Light Footer -->
                  <tr>
                    <td style="background-color:#f1f5f9; padding:20px 32px; border-top:1px solid #e2e8f0; text-align:center;">
                      <p style="font-size:11px; color:#64748b; margin:0; line-height:1.5;">
                        If you did not create an account on OmniSync, you can safely ignore this email.<br/>
                        © ${new Date().getFullYear()} OmniSync Social AutoPilot. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Welcome to OmniSync! Please confirm your email address within 2 minutes: ${verificationLink}`,
    }).then((res) => {
      logger.info(`[AuthService] ✉️ Verification email delivered in background to ${email}`);
    }).catch((emailErr) => {
      logger.warn(`[AuthService] ⚠️ Verification email background delivery error: ${emailErr.message}`);
    });

    delete user.password;
    return user;
  }

  /**
   * Resend a fresh 2-minute verification email to an unverified user.
   */
  static async resendVerification({ email, hostHeader, protocol }) {
    if (!email) {
      throw ApiError.badRequest('Field "email" is required.');
    }

    const user = await UserService.findUserByEmail(email.toLowerCase());
    if (!user) {
      throw ApiError.notFound('No account found with this email.');
    }

    if (user.emailVerified) {
      throw ApiError.badRequest('This account is already verified. Please sign in.');
    }

    const expiresAt = Date.now() + 2 * 60 * 1000; // Strictly 2 minutes from now
    const verificationToken = `${crypto.randomBytes(32).toString('hex')}_${expiresAt}`;

    // Overwrite old token in DB (instantly permanently invalidates the previous link)
    await UserService.updateUserProfile(user.id, { verificationToken });

    const verificationLink = `${protocol}://${hostHeader || 'localhost:5000'}/api/auth/verify-email?token=${verificationToken}`;
    logger.info(`[AuthService] 📧 Fresh 2-min verification link generated for ${email}: ${verificationLink}`);

    emailService.sendEmail({
      to: email,
      subject: 'Verify your OmniSync Account (New Link)',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your OmniSync Account</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#0f172a;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding:36px 16px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:24px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.04);">
                  <!-- Top Electric Blue Accent Bar -->
                  <tr>
                    <td height="6" style="background:linear-gradient(90deg, #2563EB, #0ea5e9);"></td>
                  </tr>
                  <!-- Main Body -->
                  <tr>
                    <td style="padding:36px 32px 32px 32px;">
                      <!-- Brand Logo Header -->
                      <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                        <tr>
                          <td width="42" height="42" align="center" valign="middle" style="background:linear-gradient(135deg, #2563EB, #0ea5e9); border-radius:12px; color:#ffffff; font-size:20px; font-weight:bold;">
                            ⚡
                          </td>
                          <td style="padding-left:12px;">
                            <span style="font-size:18px; font-weight:800; color:#0f172a; letter-spacing:-0.5px;">OmniSync</span><br/>
                            <span style="font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Social AutoPilot</span>
                          </td>
                        </tr>
                      </table>

                      <h1 style="font-size:22px; font-weight:800; color:#0f172a; margin:0 0 10px 0; line-height:1.3; letter-spacing:-0.4px;">
                        Fresh Verification Link
                      </h1>
                      <p style="font-size:14px; line-height:1.6; color:#475569; margin:0 0 20px 0;">
                        Hi <strong>${user.name || 'Creator'}</strong>, here is your requested fresh verification link. Please click below to activate your account:
                      </p>

                      <!-- 2-Minute Expiration Security Pill -->
                      <div style="background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:14px; padding:12px 16px; margin-bottom:24px;">
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td valign="top" style="font-size:16px; padding-right:10px;">⏱️</td>
                            <td style="font-size:13px; color:#1e40af; line-height:1.5; font-weight:500;">
                              <strong style="font-weight:700;">Security Notice:</strong> This verification link is strictly valid for <strong>2 minutes</strong>. Any previous verification link has been invalidated.
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Primary CTA Button -->
                      <div style="text-align:center; margin:28px 0;">
                        <a href="${verificationLink}" style="background:linear-gradient(135deg, #2563EB, #1d4ed8); color:#ffffff; font-size:14px; font-weight:700; text-decoration:none; padding:14px 34px; border-radius:12px; display:inline-block; box-shadow:0 4px 14px rgba(37,99,235,0.25);">
                          Verify Email Address →
                        </a>
                      </div>

                      <p style="font-size:12px; color:#64748b; line-height:1.6; margin:24px 0 0 0; word-break:break-all;">
                        Or copy and paste this URL into your browser:<br/>
                        <a href="${verificationLink}" style="color:#2563EB; text-decoration:underline;">${verificationLink}</a>
                      </p>
                    </td>
                  </tr>
                  <!-- Clean Light Footer -->
                  <tr>
                    <td style="background-color:#f1f5f9; padding:20px 32px; border-top:1px solid #e2e8f0; text-align:center;">
                      <p style="font-size:11px; color:#64748b; margin:0; line-height:1.5;">
                        If you did not request this email, you can safely ignore it.<br/>
                        © ${new Date().getFullYear()} OmniSync Social AutoPilot. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Welcome to OmniSync! Your fresh 2-minute verification link is: ${verificationLink}`,
    }).then(() => {
      logger.info(`[AuthService] ✉️ Fresh verification email delivered in background to ${email}`);
    }).catch((emailErr) => {
      logger.warn(`[AuthService] ⚠️ Fresh verification email delivery warning: ${emailErr.message}`);
    });

    return { success: true, message: 'Fresh verification email dispatched successfully. Valid for 2 minutes.' };
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

    return {
      token,
      refreshToken,
      tokens: {
        accessToken: token,
        refreshToken,
      },
      user,
    };
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
    let allowedPlatforms = isSuperAdmin ? [...SUPER_ADMIN_PLATFORMS] : [...ACTIVE_LIVE_PLATFORMS];

    if (!isSuperAdmin) {
      try {
        const setting = await prisma.systemSetting.findUnique({
          where: { key: 'PLAN_FEATURES_MATRIX' },
        });

        const userPlan = (user.plan || 'FREE').toUpperCase();
        const matrix = setting?.value || {
          FREE: { allowedPlatforms: [...ACTIVE_LIVE_PLATFORMS] },
          PRO: { allowedPlatforms: [...ACTIVE_LIVE_PLATFORMS] },
          ENTERPRISE: { allowedPlatforms: [...SUPER_ADMIN_PLATFORMS] },
        };

        if (matrix[userPlan]?.allowedPlatforms) {
          allowedPlatforms = matrix[userPlan].allowedPlatforms;
        } else {
          allowedPlatforms = [...ACTIVE_LIVE_PLATFORMS];
        }
      } catch (e) {
        allowedPlatforms = [...ACTIVE_LIVE_PLATFORMS];
      }
    }

    return {
      ...user,
      allowedPlatforms,
    };
  }
}

export default AuthService;
