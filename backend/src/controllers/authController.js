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
 * Controller: Verify User email address (Thin Handler).
 */
export const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw ApiError.badRequest('Verification token is missing.');
  }

  const user = await UserService.findUserByVerificationToken(token);

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
          h1 { color: #f43f5e; margin-top: 0; font-size: 1.5rem; }
          p { color: #94a3b8; font-size: 0.875rem; line-height: 1.5; }
          .btn { display: inline-block; margin-top: 1.5rem; background: #334155; color: #f1f5f9; padding: 0.625rem 1.25rem; border-radius: 0.75rem; text-decoration: none; font-size: 0.875rem; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Verification Failed</h1>
          <p>The verification link is invalid, expired, or has already been used.</p>
          <a href="http://localhost:3000/signup" class="btn">Back to Registration</a>
        </div>
      </body>
      </html>
    `);
  }

  await UserService.verifyUserEmail(user.id);

  res.setHeader('Content-Type', 'text/html');
  return res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Email Verified - Social Autopilot</title>
      <style>
        body { background-color: #0b0f19; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: rgba(17, 24, 39, 0.4); border: 1px solid rgba(30, 41, 59, 0.8); padding: 2.5rem; border-radius: 1.5rem; text-align: center; max-width: 400px; backdrop-filter: blur(12px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        h1 { color: #818cf8; margin-top: 0; font-size: 1.5rem; }
        p { color: #94a3b8; font-size: 0.875rem; line-height: 1.5; }
        .btn { display: inline-block; margin-top: 1.5rem; background: #4f46e5; color: white; padding: 0.625rem 1.25rem; border-radius: 0.75rem; text-decoration: none; font-size: 0.875rem; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Email Confirmed!</h1>
        <p>Your email address has been verified successfully. You can now log into your portal.</p>
        <a href="http://localhost:3000/login" class="btn">Proceed to Sign In</a>
      </div>
    </body>
    </html>
  `);
});
