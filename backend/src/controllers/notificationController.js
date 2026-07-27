import NotificationService from '../services/notificationService.js';
import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { HttpStatus } from '../utils/httpStatus.js';

export const getNotifications = catchAsync(async (req, res) => {
  const userId = req.user?.id || req.query.userId;
  const data = await NotificationService.getUserNotifications(userId);
  return successResponse(res, HttpStatus.OK, 'Notifications fetched successfully.', data);
});

export const markNotificationRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  await NotificationService.markAsRead(id, userId);
  return successResponse(res, HttpStatus.OK, 'Notification marked as read.');
});

export const markAllNotificationsRead = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  const count = await NotificationService.markAllAsRead(userId);
  return successResponse(res, HttpStatus.OK, 'All notifications marked as read.', { count });
});

export default {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
