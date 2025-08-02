import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { CONFIG } from './config';
import { logger } from './logger';
import { sanitizeInput } from '@/lib/utils';

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
function handleApiError(error, operation = 'operation', res) {
  logger.error(`${operation} failed`, error);

  if (error.name === 'ValidationError') {
    return res.status(400).json(createStandardResponse(false, null, error.message));
  }

  if (error.message?.includes('rate limit')) {
    return res.status(429).json(createStandardResponse(false, null, CONFIG.MESSAGES.ERRORS.RATE_LIMIT_EXCEEDED));
  }
  
  const errorMessage = error.message || CONFIG.MESSAGES.ERRORS.SERVER_ERROR;
  return res.status(500).json(createStandardResponse(false, null, errorMessage));
}


// ==================== API HANDLER FACTORIES ====================

/**
 * Creates a reusable handler for streaming OpenAI responses.
 * @param {object} options - Configuration for the stream handler.
 * @param {string} options.systemPrompt - The system prompt to guide the AI.
 * @param {number} [options.maxTokens=70] - The maximum number of tokens for the response.
 * @param {number} [options.maxHistory=CONFIG.MAX_CONVERSATION_HISTORY] - Max conversation history.
 * @param {string} [options.errorMessage=CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR] - Default error message.
 * @returns {function} - An async function that can be used as an API route handler.
 */
export function createOpenAIStreamHandler({ systemPrompt, maxTokens = 70, maxHistory = CONFIG.MAX_CONVERSATION_HISTORY, errorMessage = CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR }) {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const sanitizeMessages = (messages) => {
    if (!Array.isArray(messages)) return [];
    return messages
      .filter(msg => msg && typeof msg === 'object' && msg.role && msg.content)
      .map(msg => ({
        role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
        content: sanitizeInput(msg.content, CONFIG.MAX_ADVISOR_MESSAGE_LENGTH)
      }))
      .filter(msg => msg.content.length > 0)
      .slice(-maxHistory);
  };

  return async (req) => {
    try {
      const { messages } = await req.json();
      const sanitizedMessages = sanitizeMessages(messages);

      if (sanitizedMessages.length === 0) {
        return new Response(JSON.stringify({ error: 'Valid messages are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await streamText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt,
        messages: sanitizedMessages,
        maxTokens,
      });

      return result.toAIStreamResponse();
    } catch (error) {
      logger.error('AI Stream handler error:', error);
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}


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
      
      if (typeof rateLimitConfig === 'function') {
        rateLimitConfig = rateLimitConfig();
      }

      if (rateLimitConfig) {
        const clientIP = getClientIP(req);
        if (!rateLimit(clientIP, rateLimitConfig.max, rateLimitConfig.window)) {
          throw new Error('Rate limit exceeded');
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
      
      // Pass res to handler for non-edge functions
      return await handler(req, res, user);

    } catch (error) {
      return handleApiError(error, 'API request', res);
    }
  };
}