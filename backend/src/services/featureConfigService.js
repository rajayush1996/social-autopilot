import { prisma } from '../config/db.js';

/**
 * FeatureConfigService (Single Responsibility: Manage dynamic plan features & premium flags)
 */
export class FeatureConfigService {
  /**
   * Retrieve a feature config. Auto-seeds if missing.
   */
  static async getFeatureConfig(featureName) {
    let config = await prisma.featureConfig.findUnique({
      where: { feature: featureName },
    });

    if (!config) {
      config = await prisma.featureConfig.create({
        data: {
          feature: featureName,
          isPremium: false, // Default to free/enabled so features are active out-of-the-box
        },
      });
    }

    return config;
  }

  /**
   * Set or toggle if a feature is premium.
   */
  static async setFeatureConfig(featureName, isPremium) {
    return prisma.featureConfig.upsert({
      where: { feature: featureName },
      update: { isPremium },
      create: {
        feature: featureName,
        isPremium,
      },
    });
  }

  /**
   * List all feature configuration values.
   */
  static async listFeatureConfigs() {
    // Seed default settings if database is empty
    const defaults = ['autopilot', 'media-upload', 'ai-generate', 'scheduling-dispatcher'];
    
    for (const f of defaults) {
      await this.getFeatureConfig(f);
    }

    return prisma.featureConfig.findMany({
      orderBy: { feature: 'asc' },
    });
  }

  /**
   * Evaluate if a user can access a feature.
   * If a feature isPremium = true, then the user's plan must be 'PREMIUM'.
   */
  static async isFeatureAllowed(featureName, userPlan) {
    const config = await this.getFeatureConfig(featureName);
    
    // If the feature doesn't require a premium account, it's free for everyone
    if (!config.isPremium) return true;

    // Otherwise, check if user's plan is PREMIUM
    return (userPlan || '').toUpperCase() === 'PREMIUM';
  }

  /**
   * Get plan feature matrix configuration (Cached via CacheService.remember).
   */
  static async getPlanFeaturesMatrix() {
    let setting = await prisma.systemSetting.findUnique({
      where: { key: 'PLAN_FEATURES_MATRIX' },
    });

    const defaultMatrix = {
      FREE: { allowedPlatforms: ['INSTAGRAM', 'LINKEDIN', 'FACEBOOK'], maxAiCredits: 15, videoUpload: true },
      PRO: { allowedPlatforms: ['INSTAGRAM', 'LINKEDIN', 'X', 'FACEBOOK'], maxAiCredits: 500, videoUpload: true },
      ENTERPRISE: { allowedPlatforms: ['INSTAGRAM', 'LINKEDIN', 'X', 'FACEBOOK'], maxAiCredits: 9999, videoUpload: true },
    };

    if (!setting) {
      try {
        setting = await prisma.systemSetting.create({
          data: {
            key: 'PLAN_FEATURES_MATRIX',
            value: defaultMatrix,
          },
        });
      } catch (e) {
        setting = { value: defaultMatrix };
      }
    }

    return setting?.value || defaultMatrix;
  }

  /**
   * Super Admin method to update Plan Feature Matrix.
   */
  static async setPlanFeaturesMatrix(matrix) {
    const updatedSetting = await prisma.systemSetting.upsert({
      where: { key: 'PLAN_FEATURES_MATRIX' },
      update: { value: matrix },
      create: { key: 'PLAN_FEATURES_MATRIX', value: matrix },
    });

    return updatedSetting.value;
  }
}

export default FeatureConfigService;
