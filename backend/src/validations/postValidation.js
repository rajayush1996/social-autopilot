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
    emojiDensity: z.string().optional(),
    hashtagCount: z.string().optional(),
    formatStyle: z.string().optional(),
    contentLength: z.string().optional(),
    articleUrl: z
      .union([
        z.literal(''),
        z
          .string()
          .url('Article URL must be a valid absolute http(s) URL.')
          .refine((value) => /^https?:\/\//i.test(value), {
            message: 'Article URL must start with http:// or https://',
          }),
      ])
      .optional(),
    platforms: z.array(z.string()).optional(),
    targetPlatforms: z.array(z.string()).optional(),
  }),
};

/**
 * Validation schema for POST /api/posts
 */
export const createPostSchema = {
  body: z
    .object({
      userId: z.string().optional(),
      content: z.string().min(1, 'Post content cannot be empty.'),
      mediaUrls: z.array(z.string()).optional(),
      mediaType: z.string().nullable().optional(),
      targetPlatforms: z.array(z.string()).optional(),
      scheduledAt: z.union([z.string(), z.null()]).optional(),
      publishNow: z.boolean().optional(),
      aiGenerated: z.boolean().optional(),
      aiPrompt: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const isPublishNow = Boolean(data.publishNow);
      if (!isPublishNow) {
        if (!data.scheduledAt || typeof data.scheduledAt !== 'string' || data.scheduledAt.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'scheduledAt date string is required when publishNow is false.',
            path: ['scheduledAt'],
          });
        } else {
          const parsedDate = new Date(data.scheduledAt);
          if (isNaN(parsedDate.getTime())) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'scheduledAt must be a valid date string.',
              path: ['scheduledAt'],
            });
          }
        }
      }
    }),
};
