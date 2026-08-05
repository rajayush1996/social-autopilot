import { Router } from 'express';
import {
  generateAiPostContent,
  enhanceUserPrompt,
  createPost,
  listPosts,
  getPostById,
  cancelScheduledPost,
  triggerScheduledPostsNow,
  retryFailedPost,
  approvePostViaEmail,
} from '../controllers/postController.js';
import { validate } from '../middlewares/validate.js';
import { generateAiSchema, createPostSchema } from '../validations/postValidation.js';
import { authenticateJwt } from '../middlewares/auth.js';
import { aiLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

/**
 * GET /api/posts/approve-email - Public 1-Click Email Post Approval Handler
 */
router.get('/approve-email', approvePostViaEmail);

// Apply JWT authentication guard globally across remaining post endpoints
router.use(authenticateJwt);

/**
 * POST /api/posts/enhance-prompt - Magic AI Prompt Enhancer
 */
router.post('/enhance-prompt', aiLimiter, enhanceUserPrompt);

/**
 * POST /api/posts/ai-generate - Generate Post Content using OpenAI
 */
router.post('/ai-generate', aiLimiter, validate(generateAiSchema), generateAiPostContent);

/**
 * POST /api/posts - Create, Schedule, or Immediately Publish Post
 */
router.post('/', validate(createPostSchema), createPost);

/**
 * GET /api/posts - List Posts with Status Filtering & Pagination
 */
router.get('/', listPosts);

/**
 * POST /api/posts/trigger-scheduler - On-demand Trigger for Cron Scheduler
 */
router.post('/trigger-scheduler', triggerScheduledPostsNow);

/**
 * POST /api/posts/:id/retry - Retry or Republish a Failed Post
 */
router.post('/:id/retry', retryFailedPost);
router.post('/:id/republish', retryFailedPost);

/**
 * GET /api/posts/:id - Get Post Details by ID
 */
router.get('/:id', getPostById);

/**
 * PATCH /api/posts/:id/cancel - Cancel a Scheduled Post
 */
router.patch('/:id/cancel', cancelScheduledPost);

export default router;
