import { Router } from 'express';
import {
  generateAiPostContent,
  createPost,
  listPosts,
  getPostById,
  cancelScheduledPost,
  triggerScheduledPostsNow,
} from '../controllers/postController.js';
import { validate } from '../middlewares/validate.js';
import { generateAiSchema, createPostSchema } from '../validations/postValidation.js';
import { authenticateJwt } from '../middlewares/auth.js';

const router = Router();

// Apply JWT authentication guard globally across all post campaigning scopes
router.use(authenticateJwt);

/**
 * POST /api/posts/ai-generate - Generate Post Content using OpenAI
 */
router.post('/ai-generate', validate(generateAiSchema), generateAiPostContent);

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
 * GET /api/posts/:id - Get Post Details by ID
 */
router.get('/:id', getPostById);

/**
 * PATCH /api/posts/:id/cancel - Cancel a Scheduled Post
 */
router.patch('/:id/cancel', cancelScheduledPost);

export default router;
