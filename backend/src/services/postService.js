import { prisma } from '../config/db.js';

/**
 * PostService (Single Responsibility: Post database transactions & query operations)
 */
export class PostService {
  /**
   * Create a new post in the database.
   */
  static async createPost({ userId, content, mediaUrls, mediaType, targetPlatforms, status, scheduledAt, aiGenerated, aiPrompt }) {
    return prisma.post.create({
      data: {
        userId,
        content,
        mediaUrls,
        mediaType,
        targetPlatforms,
        status,
        scheduledAt,
        aiGenerated,
        aiPrompt,
      },
    });
  }

  /**
   * Find post by unique ID.
   */
  static async findPostById(id) {
    return prisma.post.findUnique({
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
  }

  /**
   * Find list of posts based on query filters.
   */
  static async findPosts({ userId, status }) {
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    return prisma.post.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update post status in database.
   */
  static async updatePostStatus(id, status) {
    return prisma.post.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Check if a post exists by ID.
   */
  static async exists(id) {
    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!post;
  }
}

export default PostService;
