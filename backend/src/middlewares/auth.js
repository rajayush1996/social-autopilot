import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { catchAsync } from '../utils/responseHandler.js';
import config from '../config/env.js';

const JWT_SECRET = config.jwt.secret;

/**
 * Middleware: Authenticate requests using JWT authorization tokens.
 * Attaches decoded user payload ({ id, email, role }) to req.user.
 */
export const authenticateJwt = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access Denied: Missing or malformed authorization token.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    throw ApiError.unauthorized('Access Denied: Invalid or expired authorization token.');
  }
});

export default authenticateJwt;
