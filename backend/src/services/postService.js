import { prisma } from '../config/db.js';
import CacheService from './cacheService.js';
import { CACHE_KEYS, TTL } from '../config/cacheKeys.js';
import { POST_STATUS } from '../config/constants.js';
import { enqueuePostJob, removePostJob } from '../queues/postQueue.js';
import NotificationService from './notificationService.js';
import logger from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { processPostPublishing } from '../workers/postWorker.js';

/**
 * PostService (Layered Architecture: Single Responsibility for Post Domain Business Logic, DB Transactions, & Cache-Aside Management)
 */
export class PostService {
  /**
   * List posts with status filtering & pagination (Cached via CacheService.remember).
   */
  static async listPosts({ userId, page = 1, limit = 10, status, platform, isAdmin = false, targetUserIdParam }) {
    const pageNumber = Number.isNaN(Number(page)) ? 1 : parseInt(page, 10);
    const pageSize = Number.isNaN(Number(limit)) ? 10 : parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;
    const take = pageSize;
    const targetUserId = isAdmin && targetUserIdParam ? targetUserIdParam : userId;

    const where = {
      userId: targetUserId,
      ...(status && { status: status.toUpperCase() }),
      ...(platform && { targetPlatforms: { has: platform.toUpperCase() } }),
    };

    const cacheKey = CACHE_KEYS.USER_POSTS_LIST(targetUserId, `${status || 'ALL'}_${platform || 'ALL'}_${pageNumber}_${pageSize}`);

    const cachedData = await CacheService.remember(cacheKey, TTL.MEDIUM, async () => {
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
      return { posts, totalCount };
    });

    return {
      posts: cachedData.posts,
      meta: {
        totalCount: cachedData.totalCount,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(cachedData.totalCount / pageSize) || 1,
      },
    };
  }

  /**
   * Find single post by ID (Cached via CacheService.remember).
   */
  static async findPostById(id, userId) {
    const cacheKey = CACHE_KEYS.POST_DETAIL(id);
    return CacheService.remember(cacheKey, TTL.MEDIUM, async () => {
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          socialPostLogs: {
            select: {
              id: true,
              platform: true,
              status: true,
              externalPostId: true,
              externalPostUrl: true,
              errorMessage: true,
              publishedAt: true,
            },
          },
        },
      });

      if (userId && post && post.userId !== userId) {
        throw new ApiError(HttpStatus.FORBIDDEN, 'Access Denied: You do not own this post record.');
      }

      return post;
    });
  }

  /**
   * Create a new post in DB, enqueue to BullMQ/Worker, and invalidate cache.
   */
  static async createPost(payload) {
    const { userId, content, mediaUrls = [], mediaType = null, targetPlatforms, scheduledAt, publishNow = false, aiGenerated = false, aiPrompt = null } = payload;

    const parseScheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    let initialStatus = POST_STATUS.DRAFT;

    if (publishNow) {
      initialStatus = POST_STATUS.DRAFT;
    } else if (parseScheduledDate) {
      initialStatus = POST_STATUS.SCHEDULED;
    }

    const post = await prisma.post.create({
      data: {
        userId,
        content,
        mediaUrls,
        mediaType,
        targetPlatforms,
        status: initialStatus,
        scheduledAt: parseScheduledDate,
        aiGenerated,
        aiPrompt,
      },
    });

    let queueResult = null;

    if (publishNow) {
      try {
        const publishResult = await processPostPublishing(post.id);
        queueResult = { immediateExecution: true, result: publishResult };
        await NotificationService.createNotification({
          userId,
          title: 'Post Published 🚀',
          message: 'Your post was dispatched and published to live social channels!',
          type: 'success',
        });
      } catch (err) {
        logger.error(`[PostService] Immediate post execution error: ${err.message}`);
        throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, `Post publishing failed: ${err.message}`);
      }
    } else if (parseScheduledDate) {
      queueResult = await enqueuePostJob({ postId: post.id, scheduledAt: parseScheduledDate });
      await NotificationService.createNotification({
        userId,
        title: 'Post Scheduled 📅',
        message: `Your post is scheduled for ${parseScheduledDate.toLocaleDateString()} at ${parseScheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        type: 'info',
      });
    }

    // Invalidate User Post Caches
    await CacheService.del(CACHE_KEYS.PATTERNS.USER_POSTS(userId));

    return { post, queueResult };
  }

  /**
   * Update post content/details & invalidate cache.
   */
  static async updatePost(id, userId, data) {
    const existing = await this.findPostById(id, userId);
    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Post not found.');
    }

    const updated = await prisma.post.update({
      where: { id },
      data,
    });

    await CacheService.invalidateMany([
      CACHE_KEYS.POST_DETAIL(id),
      CACHE_KEYS.PATTERNS.USER_POSTS(userId),
    ]);

    return updated;
  }

  /**
   * Update post status.
   */
  static async updatePostStatus(id, status) {
    const updated = await prisma.post.update({
      where: { id },
      data: { status },
    });

    if (updated) {
      await CacheService.invalidateMany([
        CACHE_KEYS.POST_DETAIL(id),
        CACHE_KEYS.PATTERNS.USER_POSTS(updated.userId),
      ]);
    }

    return updated;
  }

  /**
   * Delete post, remove queued BullMQ job, and invalidate cache.
   */
  static async deletePost(id, userId) {
    const post = await this.findPostById(id, userId);
    if (!post) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Post not found.');
    }

    if (post.status === POST_STATUS.SCHEDULED) {
      await removePostJob(id);
    }

    const deleted = await prisma.post.delete({
      where: { id },
    });

    await CacheService.invalidateMany([
      CACHE_KEYS.POST_DETAIL(id),
      CACHE_KEYS.PATTERNS.USER_POSTS(userId),
    ]);

    return deleted;
  }

  /**
   * Publish post immediately.
   */
  static async publishPostNow(id, userId) {
    const post = await this.findPostById(id, userId);
    if (!post) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Post not found.');
    }

    if (post.status === POST_STATUS.SCHEDULED) {
      await removePostJob(id);
    }

    const publishResult = await processPostPublishing(id);

    await CacheService.invalidateMany([
      CACHE_KEYS.POST_DETAIL(id),
      CACHE_KEYS.PATTERNS.USER_POSTS(userId),
    ]);

    return publishResult;
  }

  /**
   * Retry or Republish a failed post.
   */
  static async retryFailedPost(id, userId) {
    const post = await this.findPostById(id, userId);
    if (!post) {
      throw new ApiError(HttpStatus.NOT_FOUND, `Post with ID "${id}" not found.`);
    }

    // Clean up previous failed logs
    await prisma.socialPostLog.deleteMany({
      where: { postId: id, status: 'FAILED' },
    });

    // Reset post status to DRAFT so atomic lock allows re-publishing
    await this.updatePostStatus(id, POST_STATUS.DRAFT);

    const executionResult = await processPostPublishing(id);

    await CacheService.invalidateMany([
      CACHE_KEYS.POST_DETAIL(id),
      CACHE_KEYS.PATTERNS.USER_POSTS(post.userId),
    ]);

    return executionResult || post;
  }

  /**
   * Log AI generation history.
   */
  static async logAiGeneration({ userId, prompt, generatedContent, generatedText, modelUsed = 'openai-gpt-4o', tokensUsed = 120 }) {
    if (process.env.DISABLE_AUDIT_LOGS === 'true') return null;
    const textToSave = generatedText || (typeof generatedContent === 'object' ? JSON.stringify(generatedContent) : String(generatedContent || ''));
    return prisma.aIGenerationLog.create({
      data: {
        userId,
        prompt: prompt || 'AI Content Generation',
        generatedText: textToSave,
        modelUsed: modelUsed || 'openai-gpt-4o',
        tokensUsed: tokensUsed || 0,
      },
    });
  }
}

export default PostService;
