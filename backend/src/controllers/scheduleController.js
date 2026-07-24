import { catchAsync, successResponse } from '../utils/responseHandler.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { ApiError } from '../utils/ApiError.js';
import ScheduleService from '../services/scheduleService.js';

/**
 * Controller: Get system dispatcher status for user UI (checks admin toggle).
 */
export const getDispatcherStatus = catchAsync(async (req, res) => {
  const isEnabled = await ScheduleService.isDispatcherEnabledByAdmin();
  return successResponse(res, HttpStatus.OK, 'Dispatcher status retrieved.', {
    dispatcherEnabled: isEnabled,
  });
});

/**
 * Controller: Get all schedules for logged in user.
 */
export const getUserSchedules = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const isEnabled = await ScheduleService.isDispatcherEnabledByAdmin();
  const schedules = await ScheduleService.getUserSchedules(userId);
  return successResponse(res, HttpStatus.OK, 'User schedules retrieved.', {
    dispatcherEnabled: isEnabled,
    schedules,
  });
});

/**
 * Controller: Create a new automation schedule item.
 */
export const createSchedule = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const schedule = await ScheduleService.createSchedule(userId, req.body);
  return successResponse(res, HttpStatus.CREATED, 'Automation schedule created successfully.', { schedule });
});

/**
 * Controller: Update an existing automation schedule item.
 */
export const updateSchedule = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const schedule = await ScheduleService.updateSchedule(id, userId, req.body);
  return successResponse(res, HttpStatus.OK, 'Schedule updated successfully.', { schedule });
});

/**
 * Controller: Fast toggle schedule active switch (Alarm style).
 */
export const toggleSchedule = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { isActive } = req.body;

  const schedule = await ScheduleService.toggleScheduleActive(id, userId, isActive);
  return successResponse(res, HttpStatus.OK, `Schedule ${schedule.isActive ? 'activated' : 'deactivated'} successfully.`, { schedule });
});

/**
 * Controller: Delete an automation schedule item.
 */
export const deleteSchedule = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  await ScheduleService.deleteSchedule(id, userId);
  return successResponse(res, HttpStatus.OK, 'Schedule deleted successfully.');
});

/**
 * Controller: Trigger a single schedule dispatch immediately.
 */
export const runScheduleNow = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const result = await ScheduleService.runScheduleNow(id, userId);
  return successResponse(res, HttpStatus.OK, 'Schedule dispatched successfully.', result);
});

/**
 * Controller (Admin): Toggle master Scheduling Dispatcher switch.
 */
export const toggleAdminDispatcher = catchAsync(async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    throw ApiError.badRequest('Field "enabled" must be a boolean.');
  }

  await ScheduleService.setDispatcherEnabledByAdmin(enabled);
  return successResponse(res, HttpStatus.OK, `Scheduling Dispatcher master switch set to ${enabled ? 'ENABLED' : 'DISABLED'}.`, {
    dispatcherEnabled: enabled,
  });
});

/**
 * Controller (Admin/User): Run full dispatcher cycle for active schedules.
 */
export const triggerDispatcherCycle = catchAsync(async (req, res) => {
  const result = await ScheduleService.runDispatcherCycle();
  return successResponse(res, HttpStatus.OK, 'Dispatcher cycle executed.', result);
});
