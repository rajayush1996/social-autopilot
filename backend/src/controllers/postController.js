import { prisma } from '../config/db.js';
import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { ApiError } from '../utils/ApiError.js';
import { POST_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';
import { generatePostContent, optimizePostForPlatforms } from '../services/aiService.js';
import { enqueuePostJob, removePostJob } from '../queues/postQueue.js';
import { syncScheduledPostsToQueue } from '../jobs/postScheduler.js';
import { processPostPublishing } from '../workers/postWorker.js';
import UserService from '../services/userService.js';
import PostService from '../services/postService.js';
import { decrypt } from '../utils/encryption.js';

/**
 * Controller: Generate post content using OpenAI / AI service.
 */
export const generateAiPostContent = catchAsync(async (req, res) => {
  const { 
    prompt, 
    topic, 
    platform = 'GENERAL', 
    targetPlatforms, 
    platforms, 
    tone = 'ENGAGING', 
    adaptAllPlatforms = false,
    emojiDensity = 'MEDIUM',
    hashtagCount = 'MODERATE',
    formatStyle = 'SINGLE',
    articleUrl,
  } = req.body;
  const userId = req.user.id;

  const inputTopic = prompt || topic;
  if (!inputTopic && !articleUrl) {
    throw ApiError.badRequest('Field "prompt", "topic", or "articleUrl" is required.');
  }

  const selectedPlatforms = targetPlatforms || platforms || ['INSTAGRAM', 'LINKEDIN', 'X'];

  // 1. Retrieve User and Validate AI Credits (Service layer)
  const user = await UserService.ensureUserExists(userId);

  if (user.aiCredits <= 0) {
    throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, 'AI generation limit reached. Please upgrade your plan.');
  }

  let aiResult = null;
  const contentSummary = decrypt(user.contentSummary);
  const brandContext = user.brandContext || null;

  if (adaptAllPlatforms || selectedPlatforms.length > 0) {
    aiResult = await optimizePostForPlatforms({
      content: inputTopic,
      platforms: selectedPlatforms,
      tone,
      contentSummary,
      brandContext,
      emojiDensity,
      hashtagCount,
      formatStyle,
      articleUrl,
    });
  } else {
    aiResult = await generatePostContent({
      prompt: inputTopic,
      platform,
      tone,
      contentSummary,
      brandContext,
      emojiDensity,
      hashtagCount,
      formatStyle,
      articleUrl,
    });
  }

  // 2. Decrement AI credits (Service layer)
  const updatedUser = await UserService.decrementCredits(userId);

  // 3. Log AI generation in audit logs
  try {
    await prisma.aIGenerationLog.create({
      data: {
        userId,
        prompt: inputTopic,
        targetPlatform: ['INSTAGRAM', 'LINKEDIN', 'X'].includes(platform.toUpperCase()) ? platform.toUpperCase() : null,
        tone: ['PROFESSIONAL', 'CASUAL', 'ENGAGING', 'EDUCATIONAL', 'PROMOTIONAL', 'HUMOROUS'].includes(tone.toUpperCase()) ? tone.toUpperCase() : 'ENGAGING',
        generatedText: JSON.stringify(aiResult.adaptedPosts || aiResult),
        modelUsed: aiResult.modelUsed || 'MockEngine',
        tokensUsed: aiResult.tokensUsed || 0,
      },
    });
  } catch (logErr) {
    logger.warn(`[PostController] AI log db warning: ${logErr.message}`);
  }

  // 4. Return success response detailing remaining credits and top-level platform drafts
  return successResponse(res, HttpStatus.OK, 'AI post content generated successfully.', {
    ...(aiResult.adaptedPosts || {}),
    ...aiResult,
    aiCreditsRemaining: updatedUser.aiCredits,
  });
});

/**
 * Controller: Create, Schedule, or Immediately Publish Post using BullMQ.
 */
export const createPost = catchAsync(async (req, res) => {
  const {
    content,
    mediaUrls = [],
    mediaType,
    targetPlatforms = ['INSTAGRAM', 'LINKEDIN', 'X'],
    scheduledAt,
    publishNow = false,
    aiGenerated = false,
    aiPrompt,
  } = req.body;
  const userId = req.user.id;

  if (!content) {
    throw ApiError.badRequest('Field "content" is required.');
  }

  // Infer mediaType if mediaUrls exist and mediaType is omitted
  let resolvedMediaType = mediaType;
  if (!resolvedMediaType && mediaUrls.length > 0) {
    const firstUrl = mediaUrls[0].toLowerCase();
    if (firstUrl.endsWith('.mp4') || firstUrl.endsWith('.mov') || firstUrl.includes('/video/upload/')) {
      resolvedMediaType = 'VIDEO';
    } else {
      resolvedMediaType = 'IMAGE';
    }
  }

  // Normalize target platforms
  const formattedPlatforms = targetPlatforms.map((p) => p.toUpperCase());
  const invalidPlatform = formattedPlatforms.find((p) => !['INSTAGRAM', 'LINKEDIN', 'X'].includes(p));
  if (invalidPlatform) {
    throw ApiError.badRequest(`Invalid platform "${invalidPlatform}". Must be INSTAGRAM, LINKEDIN, or X.`);
  }

  // Ensure user profile exists
  await UserService.ensureUserExists(userId);

  let initialStatus = POST_STATUS.DRAFT;
  let parseScheduledDate = null;

  if (scheduledAt) {
    parseScheduledDate = new Date(scheduledAt);
    if (isNaN(parseScheduledDate.getTime())) {
      throw ApiError.badRequest('Invalid "scheduledAt" date format.');
    }
    initialStatus = POST_STATUS.SCHEDULED;
  }

  // 1. Create database record using PostService
  const post = await PostService.createPost({
    userId,
    content,
    mediaUrls,
    mediaType: resolvedMediaType,
    targetPlatforms: formattedPlatforms,
    status: initialStatus,
    scheduledAt: parseScheduledDate,
    aiGenerated,
    aiPrompt,
  });

  // 2. Enqueue in BullMQ (Immediate or Delayed Job)
  let queueResult = null;
  if (publishNow) {
    queueResult = await enqueuePostJob({ postId: post.id, publishNow: true });
    // Execute worker directly in case Redis server is not running locally
    try {
      const immediateExecution = await processPostPublishing(post.id);
      return successResponse(res, HttpStatus.OK, 'Post created and published immediately.', {
        post: immediateExecution,
        queueResult,
      });
    } catch (err) {
      logger.warn(`Worker direct execution warning: ${err.message}`);
    }
  } else if (parseScheduledDate) {
    queueResult = await enqueuePostJob({ postId: post.id, scheduledAt: parseScheduledDate });
  }

  return successResponse(
    res,
    HttpStatus.CREATED,
    initialStatus === POST_STATUS.SCHEDULED ? 'Post scheduled in BullMQ queue successfully.' : 'Post draft saved successfully.',
    {
      post,
      queueResult,
    }
  );
});

/**
 * Controller: List posts with status filtering & pagination.
 */
export const listPosts = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status, platform } = req.query;
  const userId = req.user.id;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    userId: targetUserId,
    ...(status && { status: status.toUpperCase() }),
    ...(platform && { targetPlatforms: { has: platform.toUpperCase() } }),
  };

  const [totalCount, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        socialPostLogs: true,
      },
    }),
  ]);

  return successResponse(res, HttpStatus.OK, 'Posts fetched successfully.', {
    posts,
    meta: {
      totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  });
});

/**
 * Controller: Get post by ID.
 */
export const getPostById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const post = await PostService.findPostById(id);

  if (!post) {
    throw ApiError.notFound(`Post with ID "${id}" not found.`);
  }

  return successResponse(res, HttpStatus.OK, 'Post details retrieved.', { post });
});

/**
 * Controller: Cancel a scheduled post.
 */
export const cancelScheduledPost = catchAsync(async (req, res) => {
  const { id } = req.params;

  const post = await PostService.findPostById(id);
  if (!post) {
    throw ApiError.notFound(`Post with ID "${id}" not found.`);
  }

  if (post.status === POST_STATUS.PUBLISHED) {
    throw ApiError.badRequest('Cannot cancel a post that has already been published.');
  }

  // Remove from BullMQ queue
  await removePostJob(id);

  const updatedPost = await PostService.updatePostStatus(id, POST_STATUS.CANCELLED);

  return successResponse(res, HttpStatus.OK, 'Scheduled post cancelled and removed from queue.', { post: updatedPost });
});

/**
 * Controller: Manually sync overdue DB posts into BullMQ queue.
 */
export const triggerScheduledPostsNow = catchAsync(async (req, res) => {
  const result = await syncScheduledPostsToQueue();
  return successResponse(res, HttpStatus.OK, 'Scheduled posts synchronized with BullMQ queue.', result);
});
