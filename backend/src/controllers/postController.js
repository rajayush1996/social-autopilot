import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { ApiError } from '../utils/ApiError.js';
import { POST_STATUS, SOCIAL_PLATFORM } from '../config/constants.js';
import logger from '../utils/logger.js';
import { generatePostContent, optimizePostForPlatforms } from '../services/aiService.js';
import { enqueuePostJob, removePostJob } from '../queues/postQueue.js';
import { syncScheduledPostsToQueue } from '../jobs/postScheduler.js';
import { processPostPublishing } from '../workers/postWorker.js';
import UserService from '../services/userService.js';
import PostService from '../services/postService.js';
import NotificationService from '../services/notificationService.js';
import { fetchArticleContext } from '../services/ai/articleFetcher.js';
import CacheService from '../services/cacheService.js';
import { CACHE_KEYS, TTL } from '../config/cacheKeys.js';
import FeatureConfigService from '../services/featureConfigService.js';

/**
 * Helper: Retrieve allowed platforms for a user based on role and plan matrix.
 */
async function getUserAllowedPlatforms(user) {
  if (user.role?.toUpperCase() === 'SUPER_ADMIN') {
    return ['INSTAGRAM', 'LINKEDIN', 'X', 'FACEBOOK'];
  }
  try {
    const matrix = await FeatureConfigService.getPlanFeaturesMatrix();
    const userPlan = (user.plan || 'FREE').toUpperCase();
    return matrix[userPlan]?.allowedPlatforms || ['INSTAGRAM', 'LINKEDIN', 'X', 'FACEBOOK'];
  } catch (e) {
    return ['INSTAGRAM', 'LINKEDIN', 'X', 'FACEBOOK'];
  }
}

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
    contentLength = 'BALANCED',
    articleUrl,
  } = req.body;
  const userId = req.user.id;

  const inputTopic = prompt || topic;
  if (!inputTopic && !articleUrl) {
    throw ApiError.badRequest('Field "prompt", "topic", or "articleUrl" is required.');
  }

  const selectedPlatforms = targetPlatforms || platforms || ['INSTAGRAM', 'LINKEDIN', 'X'];

  // 1. Retrieve User and Validate AI Credits & Plan Platform Limits
  const user = await UserService.ensureUserExists(userId);

  if (user.aiCredits <= 0) {
    throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, 'AI generation limit reached. Please upgrade your plan.');
  }

  const allowedPlatforms = await getUserAllowedPlatforms(user);
  const forbiddenPlatform = selectedPlatforms.map(p => p.toUpperCase()).find(p => !allowedPlatforms.includes(p));
  if (forbiddenPlatform) {
    throw ApiError.forbidden(`Platform "${forbiddenPlatform}" is not allowed on your current "${user.plan || 'FREE'}" plan. Upgrade your subscription to unlock it.`);
  }

  // 2. Fetch the source article (if any) before spending a credit, so an unreadable
  //    URL fails fast instead of producing a hallucinated summary.
  let articleContext = null;
  if (articleUrl) {
    try {
      articleContext = await fetchArticleContext(articleUrl);
      logger.info(`[PostController] Article context resolved for "${articleUrl}" (${articleContext.text.length} chars).`);
    } catch (fetchErr) {
      if (!inputTopic) {
        throw ApiError.badRequest(
          `Could not read the article at "${articleUrl}": ${fetchErr.message} Add a prompt or topic to generate without it.`
        );
      }
      logger.warn(`[PostController] Article fetch failed, continuing with prompt only: ${fetchErr.message}`);
      articleContext = { url: articleUrl, error: fetchErr.message, code: fetchErr.code };
    }
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
      contentLength,
      articleUrl,
      articleContext,
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
      contentLength,
      articleUrl,
      articleContext,
    });
  }

  // 2. Decrement AI credits (Service layer)
  const updatedUser = await UserService.decrementCredits(userId);

  // 3. Log AI generation in audit logs (PostService)
  try {
    await PostService.logAiGeneration({
      userId,
      prompt: inputTopic,
      generatedContent: aiResult.adaptedPosts || aiResult,
      modelUsed: aiResult.modelUsed || 'MockEngine',
      tokensUsed: aiResult.tokensUsed || 0,
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
  const invalidPlatform = formattedPlatforms.find((platform) => !Object.values(SOCIAL_PLATFORM).includes(platform));
  if (invalidPlatform) {
    throw ApiError.badRequest(`Invalid platform "${invalidPlatform}". Must be one of: ${Object.values(SOCIAL_PLATFORM).join(', ')}.`);
  }

  // Ensure user profile exists & validate plan permissions against Postman/API bypass
  const user = await UserService.ensureUserExists(userId);
  const allowedPlatforms = await getUserAllowedPlatforms(user);
  const forbiddenPlatform = formattedPlatforms.find((p) => !allowedPlatforms.includes(p));
  if (forbiddenPlatform) {
    throw ApiError.forbidden(`Platform "${forbiddenPlatform}" is not allowed on your current "${user.plan || 'FREE'}" plan. Upgrade your subscription to unlock it.`);
  }

  let initialStatus = POST_STATUS.DRAFT;
  let parseScheduledDate = null;

  if (scheduledAt) {
    parseScheduledDate = new Date(scheduledAt);
    if (isNaN(parseScheduledDate.getTime())) {
      throw ApiError.badRequest('Invalid "scheduledAt" date format.');
    }
    initialStatus = POST_STATUS.SCHEDULED;
  }

  // Delegate post creation, BullMQ enqueue, and cache eviction to PostService
  const { post, queueResult } = await PostService.createPost({
    userId,
    content,
    mediaUrls,
    mediaType: resolvedMediaType,
    targetPlatforms: formattedPlatforms,
    scheduledAt,
    publishNow,
    aiGenerated,
    aiPrompt,
  });

  return successResponse(
    res,
    HttpStatus.CREATED,
    publishNow
      ? 'Post created and published immediately.'
      : scheduledAt
      ? 'Post scheduled in BullMQ queue successfully.'
      : 'Post draft saved successfully.',
    {
      post,
      queueResult,
    }
  );
});

/**
 * Controller: List posts with status filtering & pagination (Delegated to PostService).
 */
export const listPosts = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status, platform, userId: targetUserIdParam } = req.query;
  const userId = req.user.id;
  const isAdmin = req.user.role === 'ADMIN';

  const result = await PostService.listPosts({
    userId,
    page,
    limit,
    status,
    platform,
    isAdmin,
    targetUserIdParam,
  });

  return successResponse(res, HttpStatus.OK, 'Posts fetched successfully.', result);
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

  await NotificationService.createNotification({
    userId: post.userId,
    title: 'Post Schedule Cancelled 🚫',
    message: 'Scheduled publication was cancelled.',
    type: 'warning',
  });

  return successResponse(res, HttpStatus.OK, 'Scheduled post cancelled and removed from queue.', { post: updatedPost });
});

/**
 * Controller: Manually sync overdue DB posts into BullMQ queue.
 */
export const triggerScheduledPostsNow = catchAsync(async (req, res) => {
  const result = await syncScheduledPostsToQueue();
  return successResponse(res, HttpStatus.OK, 'Scheduled posts synchronized with BullMQ queue.', result);
});

/**
 * Controller: Retry or Republish a failed post.
 */
export const retryFailedPost = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const result = await PostService.retryFailedPost(id, userId);

  return successResponse(res, HttpStatus.OK, 'Post retry executed successfully.', {
    post: result,
  });
});
