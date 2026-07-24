import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { ApiError } from '../utils/ApiError.js';
import UserService from '../services/userService.js';
import FeatureConfigService from '../services/featureConfigService.js';
import AutopilotService from '../services/autopilotService.js';

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
