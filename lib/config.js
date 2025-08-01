// lib/config.js

// Used in:
// - hooks/useChat.js (quickClassifyIntent)
const INTENT_CLASSIFICATION = {
  'balance': 'account.balance',
  'money': 'account.balance',
  'account': 'account.balance',
  'transfer': 'account.transfer',
  'move': 'account.transfer',
  'send': 'account.transfer',
  'transaction': 'transaction.history',
  'history': 'transaction.history',
  'recent': 'transaction.history',
  'agent': 'agent.handoff',
  'human': 'agent.handoff',
  'person': 'agent.handohandoff',
};

// ==================== CONFIGURATION ====================
export const CONFIG = {
  // API Limits
  // Used in:
  // - lib/utils.js (sanitizeInput)
  MAX_MESSAGE_LENGTH: 1000,
  // Used in:
  // - lib/apiUtils.js (createOpenAIStreamHandler)
  MAX_ADVISOR_MESSAGE_LENGTH: 2000,
  // Used in:
  // - pages/api/auth/login.js
  // - pages/api/chat/financial-advisor.js
  MAX_REQUESTS_PER_MINUTE: { BANKING: 20, ADVISOR: 10, LOGIN: 5 },
  // Used in:
  // - lib/apiUtils.js (createOpenAIStreamHandler)
  MAX_CONVERSATION_HISTORY: 20,

  // TTS Settings
  // Used in:
  // - pages/api/tts.js
  // - contexts/TTSContext.js
  TTS: {
    VOICE_ID: '21m00Tcm4TlvDq8ikWAM',
    MODEL: 'eleven_turbo_v2',
    CACHE_SIZE: 10,
  },

  // Authentication
  // Used in:
  // - pages/api/auth/login.js
  // - lib/utils.js (validateEnvironment)
  // - lib/apiUtils.js (createApiHandler)
  JWT: {
    EXPIRES_IN: '24h',
    MIN_SECRET_LENGTH: 32
  },
  // Used in:
  // - hooks/useChat.js (needsAuth)
  AUTH_REQUIRED_INTENTS: [
    'account.balance', 'account.transfer', 'account.transfer - yes',
    'transaction.history'
  ],

  // Client-side intent classification
  INTENT_CLASSIFICATION,

  // Security
  // Used in:
  // - lib/utils.js (sanitizeInput, sanitizeCredentials)
  SECURITY: {
    MAX_USERNAME_LENGTH: 100,
    MAX_PIN_LENGTH: 10,
    SANITIZE_HTML: true
  },

  // Feature Flags
  // Used in:
  // - lib/logger.js
  // - lib/utils.js (validateEnvironment)
  FEATURES: {
    ENABLE_TTS: true,
    ENABLE_SPEECH_RECOGNITION: true,
    ENABLE_DEBUG_LOGGING: process.env.NODE_ENV === 'development'
  },

  // General Messages
  // Used in:
  // - pages/api/auth/login.js
  // - pages/api/chat/financial-advisor.js
  // - hooks/useChat.js
  // - lib/apiUtils.js
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