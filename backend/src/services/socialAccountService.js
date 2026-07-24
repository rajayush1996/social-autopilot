import { prisma } from '../config/db.js';

/**
 * SocialAccountService (Single Responsibility: Social account database operations)
 */
export class SocialAccountService {
  /**
   * Link or upsert connected social media profile token metadata.
   */
  static async upsertAccount({ userId, platform, platformAccountId, username, accessToken, refreshToken, expiresAt }) {
    const existingAccount = await prisma.socialAccount.findFirst({
      where: {
        userId,
        platform,
      },
    });

    if (existingAccount) {
      return prisma.socialAccount.update({
        where: { id: existingAccount.id },
        data: {
          platformAccountId,
          username,
          accountName: `@${username} (${platform})`,
          accessToken,
          refreshToken,
          expiresAt,
          isActive: true,
        },
      });
    }

    return prisma.socialAccount.create({
      data: {
        userId,
        platform,
        platformAccountId,
        username,
        accountName: `@${username} (${platform})`,
        accessToken,
        refreshToken,
        expiresAt,
        isActive: true,
      },
    });
  }

  /**
   * Fetch connected social accounts for a user.
   */
  static async findActiveAccountsByUserId(userId) {
    return prisma.socialAccount.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        platform: true,
        username: true,
        accountName: true,
        platformAccountId: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Find social account by unique ID.
   */
  static async findAccountById(id) {
    return prisma.socialAccount.findUnique({
      where: { id },
    });
  }

  /**
   * Mark social account connection as inactive (disconnected).
   */
  static async disconnectAccount(id) {
    return prisma.socialAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export default SocialAccountService;
