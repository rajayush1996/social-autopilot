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
        },
      });
    } catch (err) {
      logger.error(`[UserService] Error ensuring user exists: ${err.message}`);
      throw err;
    }
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
    return prisma.user.update({
      where: { id: userId },
      data: {
        aiCredits: {
          decrement: 1,
        },
      },
    });
  }
}

export default UserService;
