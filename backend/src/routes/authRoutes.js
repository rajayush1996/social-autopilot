import { Router } from 'express';
import {
  getOAuthUrl,
  handleOAuthCallback,
  handleOAuthCallbackGet,
  connectAccount,
  getUserAccounts,
  disconnectAccount,
  getUserProfile,
  updateUserPlan,
  updateUserRole,
  register,
  login,
  refreshAccessToken,
  getMe,
  verifyEmail,
} from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';
import { connectAccountSchema } from '../validations/authValidation.js';
import { authenticateJwt } from '../middlewares/auth.js';

const router = Router();

/**
 * GET /api/auth/url - Get OAuth Authorization Link
 */
router.get('/url', authenticateJwt, getOAuthUrl);

/**
 * GET /api/auth/callback - OAuth Redirect Handler from LinkedIn / Social Providers
 */
router.get('/callback', handleOAuthCallbackGet);

/**
 * POST /api/auth/callback - OAuth Token Code Exchange Callback
 */
router.post('/callback', handleOAuthCallback);

/**
 * POST /api/auth/refresh - Refresh short-lived JWT access token
 */
router.post('/refresh', refreshAccessToken);

/**
 * POST /api/auth/connect - Connect or Link Social Media Account
 */
router.post('/connect', authenticateJwt, validate(connectAccountSchema), connectAccount);

/**
 * GET /api/auth/accounts - List Connected Social Accounts
 */
router.get('/accounts', authenticateJwt, getUserAccounts);

/**
 * DELETE /api/auth/accounts/:id - Disconnect Social Account
 */
router.delete('/accounts/:id', authenticateJwt, disconnectAccount);

/**
 * GET /api/auth/user/:id - Get User Profile (aiCredits, plan)
 */
router.get('/user/:id', authenticateJwt, getUserProfile);

/**
 * PATCH /api/auth/user/:id/plan - Upgrade/Downgrade User Subscription Plan
 */
router.patch('/user/:id/plan', authenticateJwt, updateUserPlan);

/**
 * PATCH /api/auth/user/:id/role - Update User Role (RBAC Mock helper)
 */
router.patch('/user/:id/role', authenticateJwt, updateUserRole);

/**
 * POST /api/auth/register - Register a new user
 */
router.post('/register', register);

/**
 * POST /api/auth/login - User login authentication
 */
router.post('/login', login);

/**
 * GET /api/auth/me - Get active logged-in user profile details
 */
router.get('/me', authenticateJwt, getMe);

/**
 * GET /api/auth/verify-email - User email verification handler
 */
router.get('/verify-email', verifyEmail);

export default router;
