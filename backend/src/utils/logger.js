import config from '../config/env.js';

/**
 * Structured Logger utility for development & production environments.
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLogLevel = config.logLevel || (config.env === 'production' ? 'info' : 'debug');

function shouldLog(level) {
  return LOG_LEVELS[level] <= (LOG_LEVELS[currentLogLevel] ?? 2);
}

function formatMessage(level, message, meta = null) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr}`;
}

export const logger = {
  error(message, meta = null) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, meta));
    }
  },

  warn(message, meta = null) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, meta));
    }
  },

  info(message, meta = null) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, meta));
    }
  },

  debug(message, meta = null) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, meta));
    }
  },
};

export default logger;
