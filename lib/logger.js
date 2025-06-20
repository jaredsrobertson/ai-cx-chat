import { CONFIG } from './config';

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLogLevel = CONFIG.ENABLE_DEBUG_LOGGING ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

// Helper function to format log messages
function formatMessage(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  
  if (Object.keys(data).length > 0) {
    return `${prefix} ${message} | Data: ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
}

// Helper function to sanitize sensitive data before logging
function sanitizeData(data) {
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

export const logger = {
  error: (message, error = null, data = {}) => {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      const sanitizedData = sanitizeData(data);
      const errorData = error ? { error: error.message || error, stack: error.stack } : {};
      console.error(formatMessage('ERROR', message, { ...sanitizedData, ...errorData }));
    }
  },
  
  warn: (message, data = {}) => {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      const sanitizedData = sanitizeData(data);
      console.warn(formatMessage('WARN', message, sanitizedData));
    }
  },
  
  info: (message, data = {}) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      const sanitizedData = sanitizeData(data);
      console.log(formatMessage('INFO', message, sanitizedData));
    }
  },
  
  debug: (message, data = {}) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      const sanitizedData = sanitizeData(data);
      console.debug(formatMessage('DEBUG', message, sanitizedData));
    }
  },
  
  // Specialized logging functions for common use cases
  auth: {
    loginAttempt: (username, success, ip) => {
      logger.info(`Login attempt`, { 
        username, 
        success, 
        ip: ip.substring(0, 10) + '...' // Partial IP for privacy
      });
    },
    
    tokenVerification: (username, success) => {
      logger.debug(`Token verification`, { username, success });
    },
    
    logout: (username) => {
      logger.info(`User logout`, { username });
    }
  },
  
  chat: {
    message: (sessionId, intent, userAuthenticated) => {
      logger.debug(`Chat message processed`, { 
        sessionId: sessionId.substring(0, 8) + '...', 
        intent, 
        userAuthenticated 
      });
    },
    
    error: (sessionId, error, context) => {
      logger.error(`Chat processing error`, error, { 
        sessionId: sessionId.substring(0, 8) + '...', 
        context 
      });
    }
  },
  
  tts: {
    request: (textLength, voiceId) => {
      logger.debug(`TTS request`, { textLength, voiceId });
    },
    
    success: (textLength, duration) => {
      logger.debug(`TTS success`, { textLength, duration });
    },
    
    error: (error, textLength) => {
      logger.error(`TTS error`, error, { textLength });
    }
  },
  
  api: {
    request: (method, endpoint, ip) => {
      logger.debug(`API request`, { 
        method, 
        endpoint, 
        ip: ip.substring(0, 10) + '...' 
      });
    },
    
    response: (endpoint, status, duration) => {
      logger.debug(`API response`, { endpoint, status, duration });
    },
    
    rateLimitHit: (ip, endpoint) => {
      logger.warn(`Rate limit exceeded`, { 
        ip: ip.substring(0, 10) + '...', 
        endpoint 
      });
    }
  },
  
  security: {
    suspiciousActivity: (type, details, ip) => {
      logger.warn(`Suspicious activity detected`, { 
        type, 
        details, 
        ip: ip.substring(0, 10) + '...' 
      });
    },
    
    inputSanitized: (originalLength, sanitizedLength) => {
      logger.debug(`Input sanitized`, { originalLength, sanitizedLength });
    }
  },
  
  performance: {
    slowQuery: (operation, duration, threshold = 1000) => {
      if (duration > threshold) {
        logger.warn(`Slow operation detected`, { operation, duration, threshold });
      }
    },
    
    cacheHit: (key, type) => {
      logger.debug(`Cache hit`, { key: key.substring(0, 20) + '...', type });
    },
    
    cacheMiss: (key, type) => {
      logger.debug(`Cache miss`, { key: key.substring(0, 20) + '...', type });
    }
  }
};

// Middleware function for API request logging
export function logApiRequest(req, res, next) {
  const start = Date.now();
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  
  logger.api.request(req.method, req.url, ip);
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    logger.api.response(req.url, res.statusCode, duration);
    
    if (duration > 2000) {
      logger.performance.slowQuery(`${req.method} ${req.url}`, duration);
    }
    
    return originalJson.call(this, data);
  };
  
  if (next) next();
}

export default logger;