import { ApiError } from '../utils/ApiError.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { errorResponse } from '../utils/responseHandler.js';
import logger from '../utils/logger.js';

/**
 * Error Converter Middleware - Normalizes all errors to ApiError.
 */
export function errorConverter(err, req, res, next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    let message = error.message || 'An unexpected error occurred';
    let details = error.details || null;

    // Prisma Known Request Error Handling (e.g. Unique constraint violation, Record not found)
    if (error.code && typeof error.code === 'string' && error.code.startsWith('P')) {
      if (error.code === 'P2002') {
        statusCode = HttpStatus.CONFLICT;
        message = `Unique constraint failed on field(s): ${error.meta?.target || 'unknown'}`;
      } else if (error.code === 'P2025') {
        statusCode = HttpStatus.NOT_FOUND;
        message = 'Requested database record was not found.';
      } else {
        statusCode = HttpStatus.BAD_REQUEST;
        message = `Database query error: ${error.message}`;
      }
    }

    // JSON syntax parse error
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Invalid JSON payload format.';
    }

    error = new ApiError(statusCode, message, false, details, err.stack);
  }

  next(error);
}

/**
 * Global Error Handler Middleware - Formats and sends final error response.
 */
export function globalErrorHandler(err, req, res, next) {
  const { statusCode, message, details, stack } = err;

  logger.error(`[ErrorHandler] ${req.method} ${req.originalUrl} - ${statusCode} ${message}`, {
    requestId: res.locals.requestId,
    details,
    stack: process.env.NODE_ENV !== 'production' ? stack : undefined,
  });

  return errorResponse(res, statusCode, message, details, stack);
}

export default { errorConverter, globalErrorHandler };
