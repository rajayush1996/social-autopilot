import { prisma } from '../config/db.js';
import CacheService from './cacheService.js';
import { CACHE_KEYS, TTL } from '../config/cacheKeys.js';

/**
 * SocialAccountService (Single Responsibility: Social account database operations with Cache-Aside pattern)
 */
export class SocialAccountService {
  /**
   * Link or upsert connected social media profile token metadata.
   */
  static async upsertAccount({ userId, platform, platformAccountId, username, accountType = 'PERSONAL', avatarUrl = null, accessToken, refreshToken, expiresAt, isPremium = false }) {
    let existingAccount = null;
    if (platformAccountId) {
      existingAccount = await prisma.socialAccount.findFirst({
        where: {
          userId,
          platform,
          platformAccountId,
        },
      });
    } else {
      existingAccount = await prisma.socialAccount.findFirst({
        where: {
          userId,
          platform,
        },
      });
    }

    let result = null;
    const typeLabel = accountType === 'ORGANIZATION' ? 'Company Page' : 'Personal';
    const accountName = `@${username} (${platform} ${typeLabel})`;

    if (existingAccount) {
      result = await prisma.socialAccount.update({
        where: { id: existingAccount.id },
        data: {
          platformAccountId,
          username,
          accountName,
          accountType,
          avatarUrl,
          accessToken,
          refreshToken,
          expiresAt,
          isPremium,
          isActive: true,
        },
      });
    } else {
      result = await prisma.socialAccount.create({
        data: {
          userId,
          platform,
          platformAccountId,
          username,
          accountName,
          accountType,
          avatarUrl,
          accessToken,
          refreshToken,
          expiresAt,
          isPremium,
          isActive: true,
        },
      });
    }

    await CacheService.del(CACHE_KEYS.USER_SOCIAL_ACCOUNTS(userId));
    return result;
  }

  /**
   * Fetch connected social accounts for a user (Cached via CacheService.remember).
   * Automatically auto-deactivates accounts whose tokens have expired.
   */
  static async findActiveAccountsByUserId(userId) {
    const accounts = await CacheService.remember(
      CACHE_KEYS.USER_SOCIAL_ACCOUNTS(userId),
      TTL.VERY_LONG,
      () => prisma.socialAccount.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          platform: true,
          username: true,
          accountName: true,
          accountType: true,
          avatarUrl: true,
          platformAccountId: true,
          isPremium: true,
          isActive: true,
          expiresAt: true,
          createdAt: true,
        },
      })
    );

    const now = Date.now();
    let hasExpiredAccounts = false;

    const validatedAccounts = (accounts || []).map((acc) => {
      const isExpired = acc.expiresAt && new Date(acc.expiresAt).getTime() <= now;
      if (isExpired) {
        hasExpiredAccounts = true;
        prisma.socialAccount.update({
          where: { id: acc.id },
          data: { isActive: false },
        }).catch(() => {});
        return { ...acc, isActive: false, status: 'EXPIRED' };
      }
      return acc;
    });

    if (hasExpiredAccounts) {
      await CacheService.del(CACHE_KEYS.USER_SOCIAL_ACCOUNTS(userId)).catch(() => {});
    }

    return validatedAccounts.filter((acc) => acc.isActive);
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
   * Find active social account by user ID and platform.
   */
  static async findActiveAccountByPlatform(userId, platform) {
    return prisma.socialAccount.findFirst({
      where: {
        userId,
        platform: platform.toUpperCase(),
        isActive: true,
      },
    });
  }

  /**
   * Mark social account connection as inactive (disconnected).
   */
  static async disconnectAccount(id) {
    const updated = await prisma.socialAccount.update({
      where: { id },
      data: { isActive: false },
    });
    if (updated) {
      await CacheService.del(CACHE_KEYS.USER_SOCIAL_ACCOUNTS(updated.userId));
    }
    return updated;
  }
}

export default SocialAccountService;
