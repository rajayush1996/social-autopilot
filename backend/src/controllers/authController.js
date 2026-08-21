import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { ApiError } from '../utils/ApiError.js';
import AuthService from '../services/authService.js';
import UserService from '../services/userService.js';
import SocialAccountService from '../services/socialAccountService.js';
import { emitAccountStatusChange } from '../services/socketService.js';

/**
 * Controller: Generate OAuth authorization URLs for target social platforms (Thin Handler).
 */
export const getOAuthUrl = catchAsync(async (req, res) => {
  const { platform } = req.query;
  const redirectUriInput = req.query.redirectUri;
  const userIdInput = req.user?.id || req.query.userId;

  const result = await AuthService.getOAuthUrl({ platform, redirectUriInput, userIdInput });
  return successResponse(res, HttpStatus.OK, `OAuth URL generated for ${result.platform}`, result);
});

/**
 * Controller: Process OAuth callback GET redirect (Thin Handler).
 */
export const handleOAuthCallbackGet = catchAsync(async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const redirectUrl = await AuthService.handleOAuthCallbackGet({ code, state, error, error_description });
  return res.redirect(redirectUrl);
});

/**
 * Controller: Process OAuth callback POST (Thin Handler).
 */
export const handleOAuthCallback = catchAsync(async (req, res) => {
  const { code, platform, codeVerifier, redirectUri } = req.body;
  const userIdInput = req.user?.id || req.body.userId;

  const account = await AuthService.handleOAuthCallback({ code, platform, codeVerifier, redirectUri, userIdInput });
  return successResponse(res, HttpStatus.OK, `${platform.toUpperCase()} social account connected.`, { account });
});

/**
 * Controller: Connect mock social account for simulation mode (Thin Handler).
 */
export const connectMockAccount = catchAsync(async (req, res) => {
  const { platform, platformAccountId, username, accountType, avatarUrl, accessToken } = req.body;
  const userIdInput = req.user?.id || req.body.userId;

  const account = await AuthService.connectMockAccount({ userIdInput, platform, platformAccountId, username, accountType, avatarUrl, accessToken });
  return successResponse(res, HttpStatus.CREATED, `Social account connected successfully.`, { account });
});

export const connectAccount = connectMockAccount;

/**
 * Controller: Get connected social accounts for current user (Thin Handler).
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
 * Controller: Disconnect a social account (Thin Handler).
 */
export const disconnectAccount = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || req.body?.userId || 'default-user-id';

  let account = await SocialAccountService.findAccountById(id);
  if (!account) {
    account = await SocialAccountService.findActiveAccountByPlatform(userId, id);
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
 * Controller: Register a new user (Thin Handler).
 */
export const register = catchAsync(async (req, res) => {
  const { email, password, name } = req.body;
  const user = await AuthService.register({
    email,
    password,
    name,
    hostHeader: req.get('host'),
    protocol: req.protocol,
  });

  return successResponse(res, HttpStatus.CREATED, 'Account registered successfully. A verification link has been sent to your email.', { user });
});

/**
 * Controller: User login (Thin Handler).
 */
export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login({ email, password });
  return successResponse(res, HttpStatus.OK, 'Authenticated successfully.', result);
});

/**
 * Controller: Refresh JWT access token (Thin Handler).
 */
export const refreshAccessToken = catchAsync(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
  const result = await AuthService.refreshAccessToken(refreshToken);
  return successResponse(res, HttpStatus.OK, 'Token refreshed successfully.', result);
});

/**
 * Controller: Retrieve current user profile (Thin Handler).
 */
export const getMe = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const user = await AuthService.getMe(userId);
  return successResponse(res, HttpStatus.OK, 'Profile retrieved successfully.', { user });
});

/**
 * Controller: Get user profile by ID (Thin Handler).
 */
export const getUserProfile = catchAsync(async (req, res) => {
  const id = req.params.id === 'me' ? (req.user?.id || 'default-user-id') : req.params.id;
  const user = await UserService.ensureUserExists(id);
  return successResponse(res, HttpStatus.OK, 'User profile retrieved successfully.', { user });
});

/**
 * Controller: Update User plan (Thin Handler).
 */
export const updateUserPlan = catchAsync(async (req, res) => {
  const id = req.params.id === 'me' ? (req.user?.id || 'default-user-id') : req.params.id;
  const { plan } = req.body;

  if (!plan || !['FREE', 'PRO', 'ENTERPRISE', 'PREMIUM'].includes(plan.toUpperCase())) {
    throw ApiError.badRequest('Field "plan" must be FREE, PRO, ENTERPRISE, or PREMIUM.');
  }

  const updatedUser = await UserService.updateUserPlan(id, plan);
  return successResponse(res, HttpStatus.OK, `User plan updated to ${plan.toUpperCase()} successfully.`, { user: updatedUser });
});

/**
 * Controller: Update User role (Thin Handler).
 */
export const updateUserRole = catchAsync(async (req, res) => {
  const id = req.params.id === 'me' ? (req.user?.id || 'default-user-id') : req.params.id;
  const { role } = req.body;

  if (!role) {
    throw ApiError.badRequest('Field "role" is required.');
  }

  const updatedUser = await UserService.updateUserRole(id, role);
  return successResponse(res, HttpStatus.OK, `User role updated to ${role.toUpperCase()} successfully.`, { user: updatedUser });
});

/**
 * Controller: Update user profile details (Thin Handler).
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

  let user = await UserService.findUserById(userId);
  let uniqueId = user?.uniqueId || `USR-${Math.floor(100000 + Math.random() * 900000)}`;

  const updatedUser = await UserService.updateUserProfile(userId, {
    ...(name !== undefined && { name }),
    ...(phoneNumber !== undefined && { phoneNumber }),
    ...(bio !== undefined && { bio }),
    ...(parsedDob && { dateOfBirth: parsedDob }),
    ...(avatarUrl !== undefined && { avatarUrl }),
    uniqueId,
  });

  delete updatedUser.password;
  return successResponse(res, HttpStatus.OK, 'Profile updated successfully.', { user: updatedUser });
});

/**
 * Controller: Verify User email address (Thin Handler with Ultra-Clean Light Theme).
 */
export const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!token) {
    throw ApiError.badRequest('Verification token is missing.');
  }

  // Check 2-minute token timestamp expiration
  let isExpired = false;
  if (typeof token === 'string' && token.includes('_')) {
    const parts = token.split('_');
    const exp = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(exp) && Date.now() > exp) {
      isExpired = true;
    }
  }

  const user = await UserService.findUserByVerificationToken(token);

  if (!user || isExpired) {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Expired - OmniSync</title>
        <style>
          * { box-sizing: border-box; }
          body {
            background-color: #f8fafc;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            padding: 2.75rem 2.25rem;
            border-radius: 1.5rem;
            text-align: center;
            max-width: 440px;
            width: 100%;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
          }
          .icon-badge {
            width: 60px;
            height: 60px;
            border-radius: 18px;
            background: #fff1f2;
            border: 1px solid #fecdd3;
            color: #e11d48;
            font-size: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem auto;
            font-weight: bold;
          }
          h1 { color: #0f172a; margin: 0 0 0.75rem 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.4px; }
          p { color: #475569; font-size: 0.925rem; line-height: 1.6; margin: 0 0 1.75rem 0; }
          .notice { background: #fff1f2; border: 1px solid #ffe4e6; padding: 10px 14px; border-radius: 12px; font-size: 0.825rem; color: #be123c; margin-bottom: 1.75rem; text-align: left; }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #2563EB, #1d4ed8);
            color: #ffffff;
            padding: 0.85rem 1.75rem;
            border-radius: 0.85rem;
            text-decoration: none;
            font-size: 0.925rem;
            font-weight: 700;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
            transition: all 0.2s;
            width: 100%;
          }
          .btn:hover { opacity: 0.95; transform: translateY(-1px); }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-badge">✕</div>
          <h1>${isExpired ? 'Link Expired' : 'Link Invalid'}</h1>
          <p>
            ${isExpired 
              ? 'This email verification link was valid for <strong>2 minutes</strong> and has expired.' 
              : 'This verification link is invalid or has already been used.'}
          </p>
          <div class="notice">
            ⏱️ <strong>Note:</strong> Verification links are limited to 2 minutes for your security. Please log in or request a fresh link.
          </div>
          <a href="${frontendUrl}/signup" class="btn">Request New Link / Sign In</a>
        </div>
      </body>
      </html>
    `);
  }

  await UserService.verifyUserEmail(user.id);

  res.setHeader('Content-Type', 'text/html');
  return res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Confirmed - OmniSync</title>
      <style>
        * { box-sizing: border-box; }
        body {
          background-color: #f8fafc;
          color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
        }
        .card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 2.75rem 2.25rem;
          border-radius: 1.5rem;
          text-align: center;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
        }
        .icon-badge {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #059669;
          font-size: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem auto;
          font-weight: bold;
        }
        h1 { color: #0f172a; margin: 0 0 0.75rem 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.4px; }
        p { color: #475569; font-size: 0.925rem; line-height: 1.6; margin: 0 0 1.75rem 0; }
        .btn {
          display: inline-block;
          background: linear-gradient(135deg, #2563EB, #1d4ed8);
          color: #ffffff;
          padding: 0.85rem 1.75rem;
          border-radius: 0.85rem;
          text-decoration: none;
          font-size: 0.925rem;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
          transition: all 0.2s;
          width: 100%;
        }
        .btn:hover { opacity: 0.95; transform: translateY(-1px); }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon-badge">✓</div>
        <h1>Email Confirmed!</h1>
        <p>Your email address has been verified successfully. Your autonomous workspace is now fully active.</p>
        <a href="${frontendUrl}/login" class="btn">Proceed to Sign In →</a>
      </div>
    </body>
    </html>
  `);
});

/**
 * Controller: Resend Email Verification Token (Thin Handler).
 */
export const resendVerification = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.resendVerification({
    email,
    hostHeader: req.get('host'),
    protocol: req.protocol,
  });

  return successResponse(res, HttpStatus.OK, result.message);
});
