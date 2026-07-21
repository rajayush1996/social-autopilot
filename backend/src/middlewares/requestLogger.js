import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Middleware to generate request ID and trace incoming HTTP requests.
 */
export function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel](`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      requestId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}

export default requestLogger;
