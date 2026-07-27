import rateLimit from 'express-rate-limit';

/**
 * Global Rate Limiter: Max 300 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 429,
    error: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});

/**
 * Authentication Rate Limiter: Max 15 login/signup attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 429,
    error: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  },
});

/**
 * AI Generation Rate Limiter: Max 30 requests per 15 minutes per IP to prevent quota abuse
 */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 429,
    error: 'AI generation request limit reached. Please wait a few minutes before generating more content.',
  },
});
