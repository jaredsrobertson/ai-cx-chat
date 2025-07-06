import { CONFIG } from './config';

// ==================== LOGGING ====================
const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const currentLogLevel = CONFIG.FEATURES.ENABLE_DEBUG_LOGGING ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'pin', 'token', 'secret', 'key', 'authorization'];

  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

function formatMessage(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;

  if (Object.keys(data).length > 0) {
    return `${prefix} ${message} | Data: ${JSON.stringify(sanitizeLogData(data))}`;
  }
  return `${prefix} ${message}`;
}

export const logger = {
  error: (message, error = null, data = {}) => {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      const errorData = error ? { error: error.message || error } : {};
      console.error(formatMessage('ERROR', message, { ...data, ...errorData }));
    }
  },
  warn: (message, data = {}) => {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, data));
    }
  },
  info: (message, data = {}) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.log(formatMessage('INFO', message, data));
    }
  },
  debug: (message, data = {}) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      console.debug(formatMessage('DEBUG', message, data));
    }
  }
};