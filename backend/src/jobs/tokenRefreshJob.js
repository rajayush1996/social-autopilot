import { prisma } from '../config/db.js';
import { getValidAccessToken } from '../services/auth/tokenManager.js';
import logger from '../utils/logger.js';

/**
 * Proactive Daily Token Refresh Job
 * Scans active social accounts and refreshes tokens expiring within 7 days,
 * ensuring Autopilot accounts stay connected continuously.
 */
export async function refreshExpiringTokens() {
  logger.info('[TokenRefreshJob] 🔄 Scanning for social account tokens expiring within 7 days...');
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    const expiringAccounts = await prisma.socialAccount.findMany({
      where: {
        isActive: true,
        expiresAt: {
          lte: sevenDaysFromNow,
        },
      },
    });

    if (expiringAccounts.length === 0) {
      logger.info('[TokenRefreshJob] ✅ All active social account tokens are healthy.');
      return { refreshedCount: 0 };
    }

    logger.info(`[TokenRefreshJob] 🔍 Found ${expiringAccounts.length} account(s) needing proactive refresh.`);
    let successCount = 0;

    for (const acc of expiringAccounts) {
      try {
        await getValidAccessToken(acc.userId, acc.platform);
        successCount++;
        logger.info(`[TokenRefreshJob] 🚀 Successfully refreshed token for User "${acc.userId}" (${acc.platform}).`);
      } catch (err) {
        logger.error(`[TokenRefreshJob] ❌ Failed to auto-refresh token for account "${acc.id}" (${acc.platform}): ${err.message}`);
      }
    }

    return { total: expiringAccounts.length, refreshedCount: successCount };
  } catch (error) {
    logger.error(`[TokenRefreshJob] ❌ Error in proactive token refresh cycle: ${error.message}`);
    return { error: error.message };
  }
}
