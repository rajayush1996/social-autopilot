import { Router } from 'express';
import {
  getOAuthUrl,
  handleOAuthCallback,
  connectAccount,
  getUserAccounts,
  disconnectAccount,
} from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';
import { connectAccountSchema } from '../validations/authValidation.js';

const router = Router();

/**
 * GET /api/auth/url - Get OAuth Authorization Link
 */
router.get('/url', getOAuthUrl);

/**
 * POST /api/auth/callback - OAuth Token Code Exchange Callback
 */
router.post('/callback', handleOAuthCallback);

/**
 * POST /api/auth/connect - Connect or Link Social Media Account
 */
router.post('/connect', validate(connectAccountSchema), connectAccount);

/**
 * GET /api/auth/accounts - List Connected Social Accounts
 */
router.get('/accounts', getUserAccounts);

/**
 * DELETE /api/auth/accounts/:id - Disconnect Social Account
 */
router.delete('/accounts/:id', disconnectAccount);

export default router;
