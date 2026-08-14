import { HttpStatus } from './httpStatus.js';

/**
 * Send a standardized JSON success response.
 */
export function successResponse(res, statusCode = HttpStatus.OK, message = 'Success', data = null, meta = {}) {
  const response = {
    success: true,
    code: statusCode,
    message,
    ...(data !== null && { data }),
    ...(Object.keys(meta).length > 0 && { meta }),
    requestId: res?.locals?.requestId || undefined,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
}

/**
 * Send a standardized JSON error response.
 */
export function errorResponse(res, statusCode = HttpStatus.INTERNAL_SERVER_ERROR, message = 'An error occurred', details = null, stack = null) {
  const isDev = process.env.NODE_ENV !== 'production';

  const response = {
    success: false,
    code: statusCode,
    error: message,
    ...(details && { details }),
    ...(isDev && stack && { stack }),
    requestId: res?.locals?.requestId || undefined,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
}

/**
 * Higher-order wrapper to catch async errors in Express route handlers / controllers.
 * Eliminates repetitive try/catch blocks in controllers.
 */
export const catchAsync = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};
