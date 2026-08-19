import { Router } from 'express';
import {
  generateAiPostContent,
  enhanceUserPrompt,
  createPost,
  listPosts,
  getPostById,
  updatePost,
  deletePost,
  cancelScheduledPost,
  triggerScheduledPostsNow,
  retryFailedPost,
  approvePostViaEmail,
  syncPostMetrics,
  regeneratePostImage,
  generateSampleVisual,
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

/**
 * POST /api/posts/trigger-scheduler - Background / Cron Sweeper (Public & Cron Safe)
 */
router.post('/trigger-scheduler', triggerScheduledPostsNow);

// Apply JWT authentication guard globally across remaining protected post endpoints
router.use(authenticateJwt);

/**
 * POST /api/posts/sample-visual - Generate live sample Flux visual
 */
router.post('/sample-visual', aiLimiter, generateSampleVisual);

/**
 * POST /api/posts/:id/sync-metrics - Sync live post engagement (Likes, Comments, Shares)
 */
router.post('/:id/sync-metrics', syncPostMetrics);

/**
 * POST /api/posts/:id/generate-image - 1-Click Generate or Regenerate AI Visual Graphic
 */
router.post('/:id/generate-image', aiLimiter, regeneratePostImage);

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
 * POST /api/posts/:id/retry - Retry or Republish a Failed Post
 */
router.post('/:id/retry', retryFailedPost);
router.post('/:id/republish', retryFailedPost);

/**
 * GET /api/posts/:id - Get Post Details by ID
 */
router.get('/:id', getPostById);

/**
 * PATCH /api/posts/:id - Update post content, schedule, or media
 * PUT /api/posts/:id - Full update post
 */
router.patch('/:id', updatePost);
router.put('/:id', updatePost);

/**
 * DELETE /api/posts/:id - Delete post and cancel queue job
 */
router.delete('/:id', deletePost);

/**
 * PATCH /api/posts/:id/cancel - Cancel a Scheduled Post
 */
router.patch('/:id/cancel', cancelScheduledPost);

export default router;
