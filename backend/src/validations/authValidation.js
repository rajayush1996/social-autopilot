import { z } from 'zod';

/**
 * Validation schema for POST /api/auth/connect
 */
export const connectAccountSchema = {
  body: z.object({
    userId: z.string().optional(),
    platform: z.enum(['INSTAGRAM', 'LINKEDIN', 'X', 'instagram', 'linkedin', 'x']),
    username: z.string().min(1, 'Username is required.'),
    accessToken: z.string().optional(),
    platformAccountId: z.string().optional(),
  }),
};
