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
  },

  // Authentication
  JWT: {
    EXPIRES_IN: '24h',
    MIN_SECRET_LENGTH: 32
  },
  AUTH_REQUIRED_INTENTS: [
    'account.balance', 'account.transfer', 'account.transfer - yes',
    'account.transactions', 'transaction.history', 'balance.check',
    'account.balance.check', 'fund.transfer', 'account.fund.transfer',
    'transactions', 'account.transaction.history'
  ],

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
    },
    INITIAL: {
        BANKING: { author: 'bot', type: 'structured', content: { speakableText: "Welcome to the SecureBank Concierge. I can help you with account balances, transaction history, and fund transfers. You can also ask to speak with a live agent. How can I assist you today?" } },
        ADVISOR: { author: 'bot', type: 'structured', content: { speakableText: "Welcome to the AI Advisor. I can help with financial planning, budgeting, and investment questions. What's on your mind?" } }
    }
  }
};