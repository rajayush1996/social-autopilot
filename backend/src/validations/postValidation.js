import { z } from 'zod';

/**
 * Validation schema for POST /api/posts/ai-generate
 */
export const generateAiSchema = {
  body: z.object({
    prompt: z.string().optional(),
    topic: z.string().optional(),
    platform: z.string().optional(),
    tone: z.string().optional(),
    adaptAllPlatforms: z.boolean().optional(),
    userId: z.string().optional(),
  }),
};

/**
 * Validation schema for POST /api/posts
 */
export const createPostSchema = {
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
