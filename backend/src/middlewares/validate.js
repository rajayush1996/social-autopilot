import { ApiError } from '../utils/ApiError.js';
import { HttpStatus } from '../utils/httpStatus.js';

/**
 * Validate incoming request payload using Zod schema.
 * 
 * @param {Object} schema - Object containing body, query, or params Zod schemas
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return next(
          new ApiError(
            HttpStatus.UNPROCESSABLE_ENTITY,
            'Validation failed for request parameters.',
            true,
            formattedErrors
          )
        );
      }
      next(error);
    }
  };
}

export default validate;
