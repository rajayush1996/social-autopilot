import { prisma } from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * UserService (Single Responsibility: User database transactions & checks)
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
      return await prisma.user.upsert({
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
    return prisma.user.update({
      where: { id: userId },
      data: { role: role.toUpperCase() },
    });
  }

  /**
   * Find user by unique ID.
   * 
   * @param {String} userId 
   * @returns {Promise<Object|null>}
   */
  static async findUserById(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
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
    return prisma.user.update({
      where: { id: targetId },
      data: {
        aiCredits: {
          decrement: 1,
        },
      },
    });
  }

  /**
   * Update User's autopilot settings.
   * 
   * @param {String} userId
   * @param {Object} data - { autopilotEnabled, brandContext }
   * @returns {Promise<Object>} Updated user record
   */
  static async updateAutopilotSettings(userId, { autopilotEnabled, brandContext }) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        autopilotEnabled,
        brandContext,
      },
    });
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
}

export default UserService;
