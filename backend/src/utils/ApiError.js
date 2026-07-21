import { HttpStatus, HttpStatusMessage } from './httpStatus.js';

/**
 * Custom operational API Error class extending native Error.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP Status Code (e.g. 400, 404, 500)
   * @param {string} message - Human readable error message
   * @param {boolean} isOperational - True if operational error, false if unhandled programming bug
   * @param {any} details - Additional validation error details or contextual data
   * @param {string} stack - Optional custom stack trace string
   */
  constructor(
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    message = null,
    isOperational = true,
    details = null,
    stack = ''
  ) {
    const finalMessage = message || HttpStatusMessage[statusCode] || 'An error occurred';
    super(finalMessage);

    this.statusCode = statusCode;
    this.message = finalMessage;
    this.isOperational = isOperational;
    this.details = details;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message, details = null) {
    return new ApiError(HttpStatus.BAD_REQUEST, message, true, details);
  }

  static unauthorized(message = 'Authentication token required or invalid.') {
    return new ApiError(HttpStatus.UNAUTHORIZED, message, true);
  }

  static forbidden(message = 'Access denied.') {
    return new ApiError(HttpStatus.FORBIDDEN, message, true);
  }

  static notFound(message = 'Resource not found.') {
    return new ApiError(HttpStatus.NOT_FOUND, message, true);
  }

  static conflict(message = 'Resource already exists or conflicts with current state.') {
    return new ApiError(HttpStatus.CONFLICT, message, true);
  }

  static internal(message = 'Internal server error occurred.', details = null) {
    return new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, message, false, details);
  }
}

export default ApiError;
