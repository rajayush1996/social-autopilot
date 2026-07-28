import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { ApiError } from '../utils/ApiError.js';
import UserService from '../services/userService.js';
import FeatureConfigService from '../services/featureConfigService.js';
import AutopilotService from '../services/autopilotService.js';
import { prisma } from '../config/db.js';
import socketManager from '../services/socketService.js';
import NotificationService from '../services/notificationService.js';

/**
 * Controller: Update autopilot configurations for a user.
 */
export const updateAutopilotSettings = catchAsync(async (req, res) => {
  const { userId, autopilotEnabled, brandContext } = req.body;
  const targetUserId = req.user?.id || (userId && userId !== 'me' ? userId : null);

  if (!targetUserId) {
    throw ApiError.unauthorized('User authentication required.');
  }

  // Save changes via UserService database layer
  const updatedUser = await UserService.updateAutopilotSettings(targetUserId, {
    autopilotEnabled: !!autopilotEnabled,
    brandContext: brandContext || '',
  });

  return successResponse(res, HttpStatus.OK, 'Autopilot settings updated successfully.', {
    user: {
      id: updatedUser.id,
      autopilotEnabled: updatedUser.autopilotEnabled,
      brandContext: updatedUser.brandContext,
    },
  });
});

/**
 * Controller: Get all feature configs (Admin visibility).
 */
export const getFeatures = catchAsync(async (req, res) => {
  const features = await FeatureConfigService.listFeatureConfigs();
  return successResponse(res, HttpStatus.OK, 'Feature configurations retrieved.', { features });
});

/**
 * Controller: Update a feature's premium status (Admin change).
 */
export const updateFeature = catchAsync(async (req, res) => {
  const { featureName } = req.params;
  const { isPremium } = req.body;

  if (typeof isPremium !== 'boolean') {
    throw ApiError.badRequest('Field "isPremium" must be a boolean.');
  }

  const updatedFeature = await FeatureConfigService.setFeatureConfig(featureName, isPremium);

  return successResponse(res, HttpStatus.OK, `Feature "${featureName}" config updated.`, { feature: updatedFeature });
});

/**
 * Controller: Manually trigger Autopilot cycle runner.
 */
export const triggerAutopilotNow = catchAsync(async (req, res) => {
  const reports = await AutopilotService.runAutopilotCycle();
  return successResponse(res, HttpStatus.OK, 'Autopilot cycle finished execution.', { reports });
});

/**
 * Controller: Super Admin endpoint to set/grant AI credits by Unique User ID or User ID.
 */
export const setUserCredits = catchAsync(async (req, res) => {
  const { targetUserId, uniqueId, email, freeCreditValue } = req.body;

  if (freeCreditValue === undefined || isNaN(Number(freeCreditValue))) {
    throw ApiError.badRequest('Field "freeCreditValue" must be a valid number.');
  }

  const creditAmount = Math.max(0, parseInt(freeCreditValue, 10));

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
    throw ApiError.notFound('Target user not found with provided User ID or Unique ID.');
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { aiCredits: creditAmount },
  });

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

  return successResponse(res, HttpStatus.OK, `Granted ${creditAmount} AI credits to user "${updatedUser.name || updatedUser.email}".`, {
    user: {
      id: updatedUser.id,
      uniqueId: updatedUser.uniqueId,
      email: updatedUser.email,
      name: updatedUser.name,
      aiCredits: updatedUser.aiCredits,
    },
  });
});

/**
 * Controller: Get plan feature matrix configuration.
 */
export const getPlanFeatures = catchAsync(async (req, res) => {
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

  return successResponse(res, HttpStatus.OK, 'Plan feature matrix retrieved.', {
    matrix: setting?.value || defaultMatrix,
  });
});

/**
 * Controller: Super Admin endpoint to update Plan Feature Matrix.
 */
export const setPlanFeatures = catchAsync(async (req, res) => {
  const { matrix } = req.body;

  if (!matrix || typeof matrix !== 'object') {
    throw ApiError.badRequest('Field "matrix" is required and must be an object.');
  }

  const updatedSetting = await prisma.systemSetting.upsert({
    where: { key: 'PLAN_FEATURES_MATRIX' },
    update: { value: matrix },
    create: { key: 'PLAN_FEATURES_MATRIX', value: matrix },
  });

  if (socketManager.io) {
    socketManager.io.emit('system_setting_updated', { key: 'PLAN_FEATURES_MATRIX', matrix: updatedSetting.value });
  }

  return successResponse(res, HttpStatus.OK, 'Plan feature matrix updated successfully.', {
    matrix: updatedSetting.value,
  });
});
