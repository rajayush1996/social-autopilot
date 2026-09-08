import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { ApiError } from '../utils/ApiError.js';
import UserService from '../services/userService.js';
import FeatureConfigService from '../services/featureConfigService.js';
import AutopilotService from '../services/autopilotService.js';
import { prisma } from '../config/db.js';

/**
 * Controller: Update autopilot configurations for a user (Thin Handler).
 */
export const updateAutopilotSettings = catchAsync(async (req, res) => {
  const { userId, autopilotEnabled, brandContext } = req.body;
  const targetUserId = req.user?.id || (userId && userId !== 'me' ? userId : null);

  if (!targetUserId) {
    throw ApiError.unauthorized('User authentication required.');
  }

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
 * Controller: Get all feature configs (Thin Handler).
 */
export const getFeatures = catchAsync(async (req, res) => {
  const features = await FeatureConfigService.listFeatureConfigs();
  return successResponse(res, HttpStatus.OK, 'Feature configurations retrieved.', { features });
});

/**
 * Controller: Update a feature's premium status (Thin Handler).
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
 * Controller: Manually trigger Autopilot cycle runner (Thin Handler).
 */
export const triggerAutopilotNow = catchAsync(async (req, res) => {
  const reports = await AutopilotService.runAutopilotCycle();
  return successResponse(res, HttpStatus.OK, 'Autopilot cycle finished execution.', { reports });
});

/**
 * Controller: Super Admin endpoint to set/grant AI credits by Unique User ID or User ID (Thin Handler).
 */
export const setUserCredits = catchAsync(async (req, res) => {
  const { targetUserId, uniqueId, email, freeCreditValue } = req.body;

  if (freeCreditValue === undefined || isNaN(Number(freeCreditValue))) {
    throw ApiError.badRequest('Field "freeCreditValue" must be a valid number.');
  }

  const creditAmount = Math.max(0, parseInt(freeCreditValue, 10));

  const updatedUser = await UserService.setUserCredits({
    targetUserId,
    uniqueId,
    email,
    creditAmount,
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
 * Controller: Get plan feature matrix configuration (Thin Handler).
 */
export const getPlanFeatures = catchAsync(async (req, res) => {
  const matrix = await FeatureConfigService.getPlanFeaturesMatrix();
  return successResponse(res, HttpStatus.OK, 'Plan feature matrix retrieved.', { matrix });
});

/**
 * Controller: Super Admin endpoint to update Plan Feature Matrix (Thin Handler).
 */
export const setPlanFeatures = catchAsync(async (req, res) => {
  const { matrix } = req.body;

  if (!matrix || typeof matrix !== 'object') {
    throw ApiError.badRequest('Field "matrix" is required and must be an object.');
  }

  const updatedMatrix = await FeatureConfigService.setPlanFeaturesMatrix(matrix);
  return successResponse(res, HttpStatus.OK, 'Plan feature matrix updated successfully.', { matrix: updatedMatrix });
});

/**
 * Controller: Get tri-state platform status matrix (Thin Handler).
 */
export const getPlatformStatus = catchAsync(async (req, res) => {
  const statusMatrix = await FeatureConfigService.getPlatformStatusMatrix();
  return successResponse(res, HttpStatus.OK, 'Platform status matrix retrieved.', { statusMatrix });
});

/**
 * Controller: Super Admin endpoint to update Platform Status Matrix (Thin Handler).
 */
export const setPlatformStatus = catchAsync(async (req, res) => {
  const { statusMatrix } = req.body;

  if (!statusMatrix || typeof statusMatrix !== 'object') {
    throw ApiError.badRequest('Field "statusMatrix" is required and must be an object.');
  }

  const updated = await FeatureConfigService.setPlatformStatusMatrix(statusMatrix);
  return successResponse(res, HttpStatus.OK, 'Platform status matrix updated successfully.', { statusMatrix: updated });
});

/**
 * Controller: Super Admin endpoint to view audit logs of emails sent/failed (Thin Handler).
 */
export const getEmailLogs = catchAsync(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
  const skip = (page - 1) * limit;
  const { status, recipient } = req.query;

  const where = {};
  if (status) where.status = String(status).toUpperCase();
  if (recipient) where.recipient = { contains: String(recipient), mode: 'insensitive' };

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    }),
    prisma.emailLog.count({ where }),
  ]);

  return successResponse(res, HttpStatus.OK, 'Email audit logs retrieved successfully.', {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  });
});

