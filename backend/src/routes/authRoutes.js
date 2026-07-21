import { Router } from 'express';
import {
  getOAuthUrl,
  handleOAuthCallback,
  connectAccount,
  getUserAccounts,
  disconnectAccount,
} from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';
import { z } from 'zod';

const router = Router();

// Validation Schemas
const connectAccountSchema = {
  body: z.object({
    userId: z.string().optional(),
    platform: z.enum(['INSTAGRAM', 'LINKEDIN', 'X', 'instagram', 'linkedin', 'x']),
    username: z.string().min(1, 'Username is required.'),
    accessToken: z.string().optional(),
    platformAccountId: z.string().optional(),
  }),
};

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
