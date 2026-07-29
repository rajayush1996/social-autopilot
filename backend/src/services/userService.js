import { prisma } from '../config/db.js';
import logger from '../utils/logger.js';
import CacheService from './cacheService.js';
import { CACHE_KEYS, TTL } from '../config/cacheKeys.js';
import socketManager from './socketService.js';
import NotificationService from './notificationService.js';
import { ApiError } from '../utils/ApiError.js';
import { HttpStatus } from '../utils/httpStatus.js';

/**
 * UserService (Single Responsibility: User database transactions & query operations with Cache-Aside pattern)
 */
export class UserService {
  /**
   * Ensure user exists in the database. If not, create a default user profile.
   * 
   * @param {String} userId 
   * @returns {Promise<Object>} The user database record
   */
  static async ensureUserExists(userId) {
    try {
      const user = await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: `user_${userId}@socialautopilot.internal`,
          name: 'Demo Content Creator',
          aiCredits: 15,
          plan: 'FREE',
          role: 'ADMIN', // Seeding as ADMIN so default sandbox has admin visibility active
          emailVerified: true,
        },
      });
      return user;
    } catch (err) {
      logger.error(`[UserService] Error ensuring user exists: ${err.message}`);
      throw err;
    }
  }

  /**
   * Update User's role (mock RBAC testing helper).
   * 
   * @param {String} userId
   * @param {String} role
   * @returns {Promise<Object>} Updated user record
   */
  static async updateUserRole(userId, role) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: role.toUpperCase() },
    });
    await CacheService.del(CACHE_KEYS.USER_PROFILE(userId));
    return updated;
  }

  /**
   * Find user by unique ID (Cached via CacheService.remember).
   * 
   * @param {String} userId 
   * @returns {Promise<Object|null>}
   */
  static async findUserById(userId) {
    return CacheService.remember(
      CACHE_KEYS.USER_PROFILE(userId),
      TTL.VERY_LONG,
      () => prisma.user.findUnique({
        where: { id: userId },
      })
    );
  }

  /**
   * Decrement user's AI credits balance by 1.
   * 
   * @param {String} userId 
   * @returns {Promise<Object>} Updated user record
   */
  static async decrementCredits(userId) {
    const targetId = userId || 'default-user-id';
    await this.ensureUserExists(targetId);
    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        aiCredits: {
          decrement: 1,
        },
      },
    });
    await CacheService.del(CACHE_KEYS.USER_PROFILE(targetId));
    return updated;
  }

  /**
   * Update User's autopilot settings.
   * 
   * @param {String} userId
   * @param {Object} data - { autopilotEnabled, brandContext }
   * @returns {Promise<Object>} Updated user record
   */
  static async updateAutopilotSettings(userId, { autopilotEnabled, brandContext }) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        autopilotEnabled,
        brandContext,
      },
    });
    await CacheService.del(CACHE_KEYS.USER_PROFILE(userId));
    return updated;
  }

  /**
   * Fetch all users who have autopilot active.
   * 
   * @returns {Promise<Array>} List of users
   */
  static async findUsersWithAutopilot() {
    return prisma.user.findMany({
      where: { autopilotEnabled: true },
    });
  }

  /**
   * Find user by unique email.
   */
  static async findUserByEmail(email) {
    if (!email) return null;
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Create a new user record.
   */
  static async createUser(data) {
    const created = await prisma.user.create({
      data: {
        ...data,
        email: data.email ? data.email.toLowerCase() : undefined,
      },
    });
    return created;
  }

  /**
   * Update user subscription plan.
   */
  static async updateUserPlan(userId, plan) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { plan: plan.toUpperCase() },
    });
    await CacheService.del(CACHE_KEYS.USER_PROFILE(userId));
    return updated;
  }

  /**
   * Update user role (RBAC helper).
   */
  static async updateUserRole(userId, role) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: role.toUpperCase() },
    });
    await CacheService.del(CACHE_KEYS.USER_PROFILE(userId));
    return updated;
  }

  /**
   * Update generic user profile data.
   */
  static async updateUserProfile(userId, data) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
    });
    await CacheService.del(CACHE_KEYS.USER_PROFILE(userId));
    return updated;
  }

  /**
   * Get latest active user in system.
   */
  static async getLatestUser() {
    return prisma.user.findFirst({
      where: { id: { not: 'default-user-id' } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Find user by verification token.
   */
  static async findUserByVerificationToken(token) {
    if (!token) return null;
    return prisma.user.findFirst({
      where: { verificationToken: token },
    });
  }

  /**
   * Mark user email as verified.
   */
  static async verifyUserEmail(userId) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });
    await CacheService.del(CACHE_KEYS.USER_PROFILE(userId));
    return updated;
  }

  /**
   * Super Admin method to set AI Credits for a user by targetUserId, uniqueId, or email.
   */
  static async setUserCredits({ targetUserId, uniqueId, email, creditAmount }) {
    let user = null;
    if (targetUserId) {
      user = await prisma.user.findUnique({ where: { id: targetUserId } });
    }
    if (!user && uniqueId) {
      user = await prisma.user.findFirst({
        where: {
          OR: [{ uniqueId }, { id: uniqueId }],
        },
      });
    }
    if (!user && email) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'Target user not found with provided User ID or Unique ID.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { aiCredits: creditAmount },
    });

    await CacheService.del(CACHE_KEYS.USER_PROFILE(updatedUser.id));

    socketManager.emitAiCreditsUpdate({
      userId: updatedUser.id,
      aiCreditsRemaining: updatedUser.aiCredits,
    });

    await NotificationService.createNotification({
      userId: updatedUser.id,
      title: 'AI Credits Granted 🎁',
      message: `Super Admin granted you ${creditAmount} AI Credits!`,
      type: 'success',
    });

    return updatedUser;
  }
}

export default UserService;
