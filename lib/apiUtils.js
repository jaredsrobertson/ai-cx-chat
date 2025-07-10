import { CONFIG } from './config';
import { logger } from './logger';

// ==================== RATE LIMITING ====================
const attempts = new Map();

function rateLimit(identifier, maxAttempts = 10, windowMs = 60000) {
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

// ==================== HELPER FUNCTIONS ====================
function getClientIP(req) {
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
function handleApiError(error, operation = 'operation') {
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
    validationSchema,
  } = options;

  let rateLimitConfig = options.rateLimit || null;

  return async (req, res) => {
    try {
      if (!allowedMethods.includes(req.method)) {
        res.setHeader('Allow', allowedMethods);
        return res.status(405).json(createStandardResponse(false, null, `Method ${req.method} Not Allowed`));
      }
      
      if (validationSchema) {
        try {
          await validationSchema.validate(req.body);
        } catch (error) {
          if (error.name === 'ValidationError') {
            return res.status(400).json(createStandardResponse(false, null, error.message));
          }
          throw error;
        }
      }

      // If rateLimitConfig is a function, call it to get the actual config object.
      // This defers the access to CONFIG until the request is handled.
      if (typeof rateLimitConfig === 'function') {
        rateLimitConfig = rateLimitConfig();
      }

      if (CONFIG.FEATURES.ENABLE_RATE_LIMITING && rateLimitConfig) {
        const clientIP = getClientIP(req);
        if (!rateLimit(clientIP, rateLimitConfig.max, rateLimitConfig.window)) {
          return res.status(429).json(createStandardResponse(false, null, CONFIG.MESSAGES.ERRORS.RATE_LIMIT_EXCEEDED));
        }
      }

      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < CONFIG.JWT.MIN_SECRET_LENGTH) {
        logger.error('JWT_SECRET configuration error');
        return res.status(500).json(createStandardResponse(false, null, CONFIG.MESSAGES.ERRORS.CONFIG_ERROR));
      }

      let user = null;
      const authHeader = req.headers.authorization;

      if (authHeader?.startsWith('Bearer ')) {
        try {
          const jwt = (await import('jsonwebtoken')).default;
          const token = authHeader.substring(7);
          user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
          user = null;
          if (requireAuth) {
            logger.warn('Required auth failed due to invalid token', { error: error.message });
            return res.status(401).json(createStandardResponse(false, null, CONFIG.MESSAGES.ERRORS.INVALID_TOKEN));
          }
        }
      }

      if (requireAuth && !user) {
        return res.status(401).json(createStandardResponse(false, null, 'Authentication required'));
      }

      return await handler(req, res, user);

    } catch (error) {
      const errorResponse = handleApiError(error, 'API request');
      return res.status(500).json(errorResponse);
    }
  };
}