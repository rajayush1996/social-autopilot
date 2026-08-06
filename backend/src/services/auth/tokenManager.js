import { prisma } from '../../config/db.js';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';
import SocialAdapterFactory from '../social/socialAdapterFactory.js';
import { encrypt, decrypt } from '../../utils/encryption.js';
import socketManager from '../socketService.js';
import NotificationService from '../notificationService.js';
import CacheService from '../cacheService.js';
import { CACHE_KEYS } from '../../config/cacheKeys.js';

/**
 * Validates, refreshes (if needed), and returns a valid decrypted access token for the specified user and platform.
 * 
 * @param {String} userId - User ID
 * @param {String} platform - PLATFORM (INSTAGRAM, LINKEDIN, X)
 * @returns {Promise<String>} Valid decrypted access token
 */
export async function getValidAccessToken(userId, platform) {
  const platformUpper = platform.toUpperCase();

  const account = await prisma.socialAccount.findFirst({
    where: {
      userId,
      platform: platformUpper,
      isActive: true,
    },
  });

  if (!account) {
    throw new Error(`No connected active ${platformUpper} account found for User ID ${userId}.`);
  }

  // Decrypt stored sensitive credentials for social API operations
  const decryptedAccessToken = decrypt(account.accessToken);
  const decryptedRefreshToken = decrypt(account.refreshToken);

  // Check if token is expired or expires within the next 5 minutes (300 seconds)
  const isExpired = account.expiresAt
    ? new Date(account.expiresAt).getTime() - Date.now() < 5 * 60 * 1000
    : false;

  // Mock token handling bypasses actual refreshing
  if (decryptedAccessToken.startsWith('mock_')) {
    logger.info(`[TokenManager] Using mock access token for ${platformUpper}.`);
    return decryptedAccessToken;
  }

  // Check if token is expired or expires within the next 5 minutes (300 seconds)
  const isExpired = account.expiresAt
    ? new Date(account.expiresAt).getTime() - Date.now() < 5 * 60 * 1000
    : false;

  if (!isExpired) {
    logger.info(`[TokenManager] Existing token for ${platformUpper} is valid until ${account.expiresAt}.`);
    return decryptedAccessToken;
  }

  logger.info(`[TokenManager] Access token for ${platformUpper} is expired or expiring soon. Initiating refresh...`);

  let refreshedData = null;

  try {
    const adapter = SocialAdapterFactory.getAdapter(platformUpper);

    if (platformUpper === 'INSTAGRAM') {
      refreshedData = await adapter.refreshToken({ accessToken: decryptedAccessToken });
    } else {
      if (!decryptedRefreshToken) {
        throw new Error(`Refresh token is missing for ${platformUpper} account.`);
      }

      const clientParams = platformUpper === 'LINKEDIN'
        ? { clientId: config.social.linkedin.clientId, clientSecret: config.social.linkedin.clientSecret }
        : { clientId: config.social.x.clientId, clientSecret: config.social.x.clientSecret };

      refreshedData = await adapter.refreshToken({
        refreshToken: decryptedRefreshToken,
        ...clientParams,
      });
    }

    if (!refreshedData || !refreshedData.accessToken) {
      throw new Error(`Token refresh returned empty access token response for ${platformUpper}.`);
    }

    const newExpiresAt = refreshedData.expiresAt
      ? new Date(refreshedData.expiresAt)
      : refreshedData.expiresIn
      ? new Date(Date.now() + refreshedData.expiresIn * 1000)
      : null;

    logger.info(`[TokenManager] Successfully refreshed token for ${platformUpper}. Updating database...`);

    // Update in database with AES-256-GCM encryption
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        accessToken: encrypt(refreshedData.accessToken),
        refreshToken: encrypt(refreshedData.refreshToken || decryptedRefreshToken),
        expiresAt: newExpiresAt,
      },
    });

    return refreshedData.accessToken;
  } catch (err) {
    logger.error(`[TokenManager] Failed to refresh token for ${platformUpper}: ${err.message}`);

    // Auto-Disconnect logic: Mark account as inactive in DB, clear Redis cache, and emit WebSocket & Notification
    try {
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: { isActive: false },
      });

      await CacheService.del(CACHE_KEYS.USER_SOCIAL_ACCOUNTS(userId)).catch(() => {});

      socketManager.emitAccountStatusChange({
        userId,
        platform: platformUpper,
        connected: false,
        reason: 'TOKEN_EXPIRED',
      });

      await NotificationService.createNotification({
        userId,
        title: `⚠️ ${platformUpper} Session Expired`,
        message: `Your ${platformUpper} account session has expired. Please reconnect your account to resume publishing.`,
        type: 'warning',
      }).catch(() => {});
    } catch (dbErr) {
      logger.warn(`[TokenManager] Failed to auto-deactivate expired account ${account.id}: ${dbErr.message}`);
    }

    throw new Error(`Your ${platformUpper} session has expired (${err.message}). Account has been automatically disconnected. Please reconnect.`);
  }
}

export default getValidAccessToken;
