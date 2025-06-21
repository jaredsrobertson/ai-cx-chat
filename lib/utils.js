// Consolidated utilities combining config, validation, rate limiting, and logging

// ==================== CONFIGURATION ====================
export const CONFIG = {
  // API Limits
  MAX_MESSAGE_LENGTH: 1000,
  MAX_ADVISOR_MESSAGE_LENGTH: 2000,
  MAX_REQUESTS_PER_MINUTE: { BANKING: 20, ADVISOR: 10, LOGIN: 5 },
  MAX_CONVERSATION_HISTORY: 20,
  
  // TTS Settings
  TTS: {
    VOICE_ID: '21m00Tcm4TlvDq8ikWAM',
    MODEL: 'eleven_flash_v2_5',
    CACHE_SIZE: 10,
    RETRY_ATTEMPTS: 2
  },
  
  // Authentication
  JWT: {
    EXPIRES_IN: '24h',
    MIN_SECRET_LENGTH: 32
  },
  
  // Security
  SECURITY: {
    MAX_USERNAME_LENGTH: 100,
    MAX_PIN_LENGTH: 10,
    SANITIZE_HTML: true
  },
  
  // Feature Flags
  FEATURES: {
    ENABLE_TTS: true,
    ENABLE_SPEECH_RECOGNITION: true,
    ENABLE_RATE_LIMITING: true,
    ENABLE_DEBUG_LOGGING: process.env.NODE_ENV === 'development'
  },
  
  // Messages
  MESSAGES: {
    ERRORS: {
      INVALID_CREDENTIALS: 'Invalid credentials',
      RATE_LIMIT_EXCEEDED: 'Too many requests. Please slow down.',
      SERVER_ERROR: 'Internal server error. Please try again.',
      INVALID_TOKEN: 'Invalid authentication token',
      MESSAGE_REQUIRED: 'Valid message is required',
      CONFIG_ERROR: 'Server configuration error',
      TTS_ERROR: 'Failed to generate speech',
      DIALOGFLOW_ERROR: "I'm having trouble connecting to my services right now.",
      ADVISOR_ERROR: 'Failed to get response from financial advisor.'
    },
    SUCCESS: {
      LOGIN: 'Login successful',
      TRANSFER_COMPLETE: 'The transfer has been completed successfully.'
    }
  }
};

// ==================== VALIDATION ====================
export function validateEnvironment() {
  const required = {
    JWT_SECRET: { minLength: CONFIG.JWT.MIN_SECRET_LENGTH },
    GOOGLE_CLOUD_PROJECT_ID: { required: false },
    OPENAI_API_KEY: { required: false },
    ELEVENLABS_API_KEY: { required: false }
  };

  const errors = [];
  const warnings = [];

  for (const [key, config] of Object.entries(required)) {
    const value = process.env[key];
    
    if (!value) {
      if (config.required !== false) {
        errors.push(`${key} is required but not set`);
      } else {
        warnings.push(`${key} not set - feature will be unavailable`);
      }
    } else if (config.minLength && value.length < config.minLength) {
      errors.push(`${key} must be at least ${config.minLength} characters long`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:', errors);
    throw new Error('Invalid environment configuration');
  }

  if (warnings.length > 0 && CONFIG.FEATURES.ENABLE_DEBUG_LOGGING) {
    console.warn('⚠️ Environment warnings:', warnings);
  }

  if (CONFIG.FEATURES.ENABLE_DEBUG_LOGGING) {
    console.log('✅ Environment validation passed');
  }
}

// ==================== RATE LIMITING ====================
const attempts = new Map();

export function rateLimit(identifier, maxAttempts = 10, windowMs = 60000) {
  const now = Date.now();
  const userAttempts = attempts.get(identifier) || { count: 0, resetTime: now + windowMs };
  
  if (now > userAttempts.resetTime) {
    userAttempts.count = 0;
    userAttempts.resetTime = now + windowMs;
  }
  
  userAttempts.count++;
  attempts.set(identifier, userAttempts);
  
  return userAttempts.count <= maxAttempts;
}

// ==================== INPUT SANITIZATION ====================
export function sanitizeInput(input, maxLength = CONFIG.MAX_MESSAGE_LENGTH) {
  if (typeof input !== 'string') return '';
  
  let sanitized = input;
  
  if (CONFIG.SECURITY.SANITIZE_HTML) {
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }
  
  return sanitized.trim().substring(0, maxLength);
}

export function sanitizeCredentials(username, pin) {
  return {
    username: sanitizeInput(username, CONFIG.SECURITY.MAX_USERNAME_LENGTH),
    pin: sanitizeInput(pin, CONFIG.SECURITY.MAX_PIN_LENGTH)
  };
}

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

// ==================== HELPER FUNCTIONS ====================
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['cf-connecting-ip'] || 
         req.connection?.remoteAddress || 
         'unknown';
}

export function createStandardResponse(success, data = null, error = null) {
  return {
    success,
    ...(data && { data }),
    ...(error && { error })
  };
}

// ==================== ERROR HANDLING ====================
export function handleApiError(error, operation = 'operation') {
  logger.error(`${operation} failed`, error);
  
  if (error.name === 'ValidationError') {
    return createStandardResponse(false, null, CONFIG.MESSAGES.ERRORS.MESSAGE_REQUIRED);
  }
  
  if (error.message?.includes('rate limit')) {
    return createStandardResponse(false, null, CONFIG.MESSAGES.ERRORS.RATE_LIMIT_EXCEEDED);
  }
  
  return createStandardResponse(false, null, CONFIG.MESSAGES.ERRORS.SERVER_ERROR);
}

// ==================== API MIDDLEWARE ====================
export function createApiHandler(handler, options = {}) {
  const { 
    allowedMethods = ['POST'], 
    requireAuth = false, 
    rateLimit: rateLimitConfig = null 
  } = options;

  return async (req, res) => {
    try {
      // Method validation
      if (!allowedMethods.includes(req.method)) {
        res.setHeader('Allow', allowedMethods);
        return res.status(405).json(createStandardResponse(false, null, `Method ${req.method} Not Allowed`));
      }

      // Rate limiting
      if (rateLimitConfig) {
        const clientIP = getClientIP(req);
        if (!rateLimit(clientIP, rateLimitConfig.max, rateLimitConfig.window)) {
          return res.status(429).json(createStandardResponse(false, null, CONFIG.MESSAGES.ERRORS.RATE_LIMIT_EXCEEDED));
        }
      }

      // Environment validation
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < CONFIG.JWT.MIN_SECRET_LENGTH) {
        logger.error('JWT_SECRET configuration error');
        return res.status(500).json(createStandardResponse(false, null, CONFIG.MESSAGES.ERRORS.CONFIG_ERROR));
      }

      // --- AUTHENTICATION REFACTOR ---
      let user = null;
      const authHeader = req.headers.authorization;

      // Always try to decode token if it exists
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const jwt = (await import('jsonwebtoken')).default;
          const token = authHeader.substring(7);
          user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
          // Token is invalid, expired, or malformed.
          user = null; // Ensure user is null
          // If auth is strictly required for this endpoint, we must fail here.
          if (requireAuth) {
            logger.warn('Required auth failed due to invalid token', { error: error.message });
            return res.status(401).json(createStandardResponse(false, null, CONFIG.MESSAGES.ERRORS.INVALID_TOKEN));
          }
        }
      }

      // If auth is required and we still don't have a user (i.e., no token was provided at all), fail.
      if (requireAuth && !user) {
        return res.status(401).json(createStandardResponse(false, null, 'Authentication required'));
      }
      // --- END OF REFACTOR ---

      // Call the actual handler
      return await handler(req, res, user);

    } catch (error) {
      const errorResponse = handleApiError(error, 'API request');
      return res.status(500).json(errorResponse);
    }
  };
}