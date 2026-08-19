import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { ApiError } from '../utils/ApiError.js';
import { POST_STATUS, SOCIAL_PLATFORM } from '../config/constants.js';
import logger from '../utils/logger.js';
import { generatePostContent, optimizePostForPlatforms, enhancePrompt } from '../services/aiService.js';
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
import { encrypt, decrypt } from "../utils/encryption.js";
import emailService from '../services/emailService.js';
import { prisma } from '../config/db.js';
import { defaultLinkedinAdapter } from '../services/social/linkedinService.js';
import ImageService from '../services/ai/imageService.js';
import { extractBrandFromContent } from '../utils/brandExtractor.js';


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
 * Controller: Magic Prompt Enhancer - expands rough thought into optimized prompt (Thin Handler).
 */
export const enhanceUserPrompt = catchAsync(async (req, res) => {
  const { rawThought, platform = 'GENERAL', tone = 'ENGAGING' } = req.body;

  if (!rawThought || !rawThought.trim()) {
    throw ApiError.badRequest('Field "rawThought" is required.');
  }

  const result = await enhancePrompt({ rawThought, platform, tone });
  return successResponse(res, HttpStatus.OK, 'Prompt enhanced successfully.', result);
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

/**
 * Controller: 1-Click Email Post Approval Endpoint
 */
export const approvePostViaEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Approval Failed</title></head>
        <body style="background:#0b0f19; color:#f3f4f6; font-family:sans-serif; text-align:center; padding:60px 20px;">
          <div style="max-width:500px; margin:0 auto; background:#111827; border:1px solid #f43f5e; border-radius:20px; padding:40px;">
            <h1 style="color:#f43f5e; margin-bottom:10px;">⚠️ Invalid Link</h1>
            <p style="color:#9ca3af;">Approval token is missing from the request URL.</p>
          </div>
        </body>
        </html>
      `);
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const { postId } = decoded;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: true },
    });

    if (!post) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Post Not Found</title></head>
        <body style="background:#0b0f19; color:#f3f4f6; font-family:sans-serif; text-align:center; padding:60px 20px;">
          <div style="max-width:500px; margin:0 auto; background:#111827; border:1px solid #f43f5e; border-radius:20px; padding:40px;">
            <h1 style="color:#f43f5e; margin-bottom:10px;">⚠️ Post Not Found</h1>
            <p style="color:#9ca3af;">The requested post could not be found or has already been deleted.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Update status to SCHEDULED
    const updated = await prisma.post.update({
      where: { id: postId },
      data: { status: POST_STATUS.SCHEDULED },
    });

    const now = new Date();
    if (!post.scheduledAt || post.scheduledAt <= now) {
      await enqueuePostJob({ postId, publishNow: true });
    } else {
      await enqueuePostJob({ postId, scheduledAt: post.scheduledAt });
    }

    let textToDisplay = post.content || '';
    try {
      if (textToDisplay.trim().startsWith('{')) {
        const parsed = JSON.parse(textToDisplay);
        textToDisplay = parsed.LINKEDIN || parsed.INSTAGRAM || parsed.FACEBOOK || parsed.X || parsed.content || textToDisplay;
      }
    } catch (e) {}

    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const formattedDate = post.scheduledAt ? new Date(post.scheduledAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : 'Immediate Release';

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Post Approved Successfully - OmniSync</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a; text-align: center; padding: 60px 20px; margin: 0; }
          .card { max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05); }
          .icon-badge { width: 56px; height: 56px; background: #eff6ff; border: 1px solid #bfdbfe; color: #2563eb; font-size: 28px; border-radius: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; }
          h1 { color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 10px 0; tracking-tight; }
          p { color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px; font-weight: 500; }
          .post-preview { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; text-align: left; font-size: 13px; color: #1e293b; margin-bottom: 24px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
          .meta-slot { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-size: 12px; font-weight: 700; padding: 10px 16px; border-radius: 10px; margin-bottom: 28px; display: block; }
          .btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25); transition: all 0.2s; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-badge">⚡</div>
          <h1>Post Approved & Queued!</h1>
          <p>Your post content has been verified and queued for automated release across your target social channels.</p>
          <div class="post-preview">${textToDisplay}</div>
          <div class="meta-slot">📅 Scheduled Slot: ${formattedDate}</div>
          <a href="${appUrl}/posts" class="btn">View in Dashboard 🚀</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Approval Link Expired</title></head>
      <body style="background:#0b0f19; color:#f3f4f6; font-family:sans-serif; text-align:center; padding:60px 20px;">
        <div style="max-width:500px; margin:0 auto; background:#111827; border:1px solid #f43f5e; border-radius:20px; padding:40px;">
          <h1 style="color:#f43f5e; margin-bottom:10px;">⚠️ Link Expired or Invalid</h1>
          <p style="color:#9ca3af;">This approval link is invalid or has expired.</p>
        </div>
      </body>
      </html>
    `);
  }
};

/**
 * Controller: Update an existing post (content, media, status, scheduledAt, platforms).
 */
export const updatePost = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { content, platforms, mediaUrl, mediaType, scheduledAt, status, tone, targetUrl } = req.body;

  const updateData = {};
  if (content !== undefined) updateData.content = content;
  if (platforms !== undefined) updateData.platforms = Array.isArray(platforms) ? platforms : [platforms];
  if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
  if (mediaType !== undefined) updateData.mediaType = mediaType;
  if (status !== undefined) updateData.status = status;
  if (tone !== undefined) updateData.tone = tone;
  if (targetUrl !== undefined) updateData.targetUrl = targetUrl;

  if (scheduledAt !== undefined) {
    const scheduledDate = new Date(scheduledAt);
    if (!isNaN(scheduledDate.getTime())) {
      updateData.scheduledAt = scheduledDate;
      // If the post is currently in SCHEDULED status, adjust queue delay safely
      try {
        const existingPost = await PostService.findPostById(id, userId);
        if (existingPost && existingPost.status === POST_STATUS.SCHEDULED) {
          await removePostJob(id);
          const delayMs = Math.max(0, scheduledDate.getTime() - Date.now());
          await enqueuePostJob(id, delayMs);
        }
      } catch (queueErr) {
        logger.warn(`[updatePost] Queue adjustment skipped for post ${id}: ${queueErr.message}`);
      }
    }
  }

  const updatedPost = await PostService.updatePost(id, userId, updateData);

  return successResponse(res, HttpStatus.OK, 'Post updated successfully.', { post: updatedPost });
});

/**
 * Controller: Delete a post and remove from queue.
 */
export const deletePost = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const deleted = await PostService.deletePost(id, userId);

  return successResponse(res, HttpStatus.OK, 'Post deleted successfully.', { post: deleted });
});

/**
 * Controller: Sync real-time engagement metrics (Likes, Comments, Shares, Reach) for a published post.
 */
export const syncPostMetrics = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const post = await prisma.post.findFirst({
    where: { id, userId },
    include: {
      socialPostLogs: {
        include: { socialAccount: true },
      },
    },
  });

  if (!post) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Post not found.');
  }

  let metrics = { views: 120, likes: 1, comments: 0, shares: 0, engagementRate: '0.8%', isLiveSynced: false };

  const linkedinLog = post.socialPostLogs?.find((l) => l.platform === 'LINKEDIN' && l.status === 'SUCCESS');
  if (linkedinLog && linkedinLog.externalPostId) {
    const accessToken = linkedinLog.socialAccount?.accessToken;
    metrics = await defaultLinkedinAdapter.fetchPostEngagement({
      accessToken,
      externalPostId: linkedinLog.externalPostId,
    });
  }

  return successResponse(res, HttpStatus.OK, 'Post metrics synced successfully.', { metrics });
});

/**
 * Controller: 1-Click Generate or Regenerate AI Visual Graphic for a post.
 */
export const regeneratePostImage = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const post = await prisma.post.findFirst({
    where: { id, userId },
  });

  if (!post) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Post not found.');
  }

  const detectedBrand = extractBrandFromContent(post.content);
  const visualRes = await ImageService.generatePostVisual({
    topic: post.aiPrompt || 'Tech Innovation',
    brandName: detectedBrand,
    content: post.content,
    tone: post.tone,
  });

  if (!visualRes || !visualRes.imageUrl) {
    throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate visual graphic.');
  }

  const updatedPost = await PostService.updatePost(id, userId, {
    mediaUrls: [visualRes.imageUrl],
    mediaType: 'IMAGE',
  });

  return successResponse(res, HttpStatus.OK, 'AI Visual Graphic generated successfully!', {
    post: updatedPost,
    imageUrl: visualRes.imageUrl,
  });
});

/**
 * Controller: Generate a live sample Flux visual graphic from a prompt
 */
export const generateSampleVisual = catchAsync(async (req, res) => {
  const { topic, brandName, tone = 'ENGAGING' } = req.body;
  const visualRes = await ImageService.generatePostVisual({
    topic: topic || 'Tech Innovation & AI Productivity Workflows',
    brandName,
    tone,
  });

  if (!visualRes || !visualRes.imageUrl) {
    throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate visual graphic.');
  }

  return successResponse(res, HttpStatus.OK, 'Sample visual generated successfully', visualRes);
});



