import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { HttpStatus } from '../utils/httpStatus.js';
import PlaceholderService from '../services/placeholderService.js';

export const getUserPlaceholders = catchAsync(async (req, res) => {
  const userId = req.user?.id || req.query.userId || 'default-user-id';
  const placeholders = await PlaceholderService.getUserPlaceholders(userId);
  return successResponse(res, HttpStatus.OK, 'User placeholders retrieved successfully.', { placeholders });
});

export const saveUserPlaceholders = catchAsync(async (req, res) => {
  const userId = req.user?.id || req.body.userId || 'default-user-id';
  const { placeholders } = req.body;
  const saved = await PlaceholderService.saveUserPlaceholders(userId, placeholders || []);
  return successResponse(res, HttpStatus.OK, 'User placeholders saved successfully.', { placeholders: saved });
});

export const createPlaceholder = catchAsync(async (req, res) => {
  const userId = req.user?.id || req.body.userId || 'default-user-id';
  const { name, value } = req.body;
  const created = await PlaceholderService.createPlaceholder(userId, { name, value });
  return successResponse(res, HttpStatus.CREATED, 'Placeholder created successfully.', { placeholder: created });
});

export const updatePlaceholder = catchAsync(async (req, res) => {
  const userId = req.user?.id || req.body.userId || 'default-user-id';
  const { id } = req.params;
  const { name, value } = req.body;
  const updated = await PlaceholderService.updatePlaceholder(userId, id, { name, value });
  return successResponse(res, HttpStatus.OK, 'Placeholder updated successfully.', { placeholder: updated });
});

export const deletePlaceholder = catchAsync(async (req, res) => {
  const userId = req.user?.id || req.query.userId || 'default-user-id';
  const { id } = req.params;
  const result = await PlaceholderService.deletePlaceholder(userId, id);
  return successResponse(res, HttpStatus.OK, 'Placeholder deleted successfully.', result);
});
