import config from '../config/env.js';

/**
 * ANSI Color codes for terminal logging
 */
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  error: '\x1b[31m',   // Red
  warn: '\x1b[33m',    // Yellow
  info: '\x1b[36m',    // Cyan
  debug: '\x1b[35m',   // Magenta
  gray: '\x1b[90m',    // Dark Gray
};

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
  const levelUpper = level.toUpperCase();
  const color = COLORS[level] || COLORS.reset;
  
  const metaStr = meta ? ` ${COLORS.gray}| Meta: ${JSON.stringify(meta)}${COLORS.reset}` : '';
  const timestampFormatted = `${COLORS.gray}[${timestamp}]${COLORS.reset}`;
  const levelFormatted = `${color}${COLORS.bold}[${levelUpper}]${COLORS.reset}`;

  return `${timestampFormatted} ${levelFormatted}: ${color}${message}${COLORS.reset}${metaStr}`;
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
