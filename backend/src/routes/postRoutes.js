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
import { z } from 'zod';

const router = Router();

// Validation Schemas
const generateAiSchema = {
  body: z.object({
    prompt: z.string().optional(),
    topic: z.string().optional(),
    platform: z.string().optional(),
    tone: z.string().optional(),
    adaptAllPlatforms: z.boolean().optional(),
    userId: z.string().optional(),
  }),
};

const createPostSchema = {
  body: z.object({
    userId: z.string().optional(),
    content: z.string().min(1, 'Post content cannot be empty.'),
    mediaUrls: z.array(z.string().url('Each mediaUrl must be a valid URL')).optional(),
    mediaType: z.string().optional(),
    targetPlatforms: z.array(z.string()).optional(),
    scheduledAt: z.string().datetime({ offset: true }).or(z.string()).optional(),
    publishNow: z.boolean().optional(),
    aiGenerated: z.boolean().optional(),
    aiPrompt: z.string().optional(),
  }),
};

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
