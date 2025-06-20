// Application configuration constants
export const CONFIG = {
  // API Limits
  MAX_MESSAGE_LENGTH: 1000,
  MAX_ADVISOR_MESSAGE_LENGTH: 2000,
  MAX_REQUESTS_PER_MINUTE_BANKING: 20,
  MAX_REQUESTS_PER_MINUTE_ADVISOR: 10,
  MAX_REQUESTS_PER_MINUTE_LOGIN: 5,
  MAX_CONVERSATION_HISTORY: 20,
  
  // TTS Settings
  TTS_VOICE_ID: '21m00Tcm4TlvDq8ikWAM', // Rachel voice
  TTS_MODEL: 'eleven_flash_v2_5',
  TTS_CACHE_SIZE: 10,
  TTS_RETRY_ATTEMPTS: 2,
  
  // Authentication
  JWT_EXPIRES_IN: '24h',
  JWT_MIN_SECRET_LENGTH: 32,
  
  // Chat Settings
  MAX_CHAT_HISTORY: 50,
  SPEECH_RECOGNITION_TIMEOUT: 5000,
  SPEECH_RECOGNITION_DEBOUNCE: 300,
  
  // Security
  INPUT_SANITIZATION: {
    REMOVE_SCRIPTS: true,
    REMOVE_JAVASCRIPT: true,
    REMOVE_EVENT_HANDLERS: true,
    MAX_USERNAME_LENGTH: 100,
    MAX_PIN_LENGTH: 10
  },
  
  // Performance
  AUTO_SCROLL_BEHAVIOR: 'smooth',
  ANIMATION_DURATION: 300,
  
  // Development flags
  ENABLE_DEBUG_LOGGING: process.env.NODE_ENV === 'development',
  MOCK_MODE: process.env.NODE_ENV === 'development' && !process.env.OPENAI_API_KEY,
  ENABLE_TRANSFER_DEBUG: process.env.NODE_ENV === 'development',
  
  // Error Messages
  ERRORS: {
    INVALID_CREDENTIALS: 'Invalid credentials',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please slow down.',
    SERVER_ERROR: 'Internal server error. Please try again.',
    INVALID_TOKEN: 'Invalid authentication token',
    MESSAGE_REQUIRED: 'Valid message is required',
    CONFIG_ERROR: 'Server configuration error',
    NETWORK_ERROR: 'A network error occurred.',
    TTS_ERROR: 'Failed to generate speech',
    DIALOGFLOW_ERROR: "I'm having trouble connecting to my services right now.",
    ADVISOR_ERROR: 'Failed to get response from financial advisor.'
  },
  
  // Success Messages
  SUCCESS: {
    LOGIN: 'Login successful',
    LOGOUT: 'Logged out successfully',
    TRANSFER_COMPLETE: 'The transfer has been completed successfully.',
    MESSAGE_SENT: 'Message sent'
  },
  
  // Feature Flags
  FEATURES: {
    ENABLE_TTS: true,
    ENABLE_SPEECH_RECOGNITION: true,
    ENABLE_VOICE_COMMANDS: true,
    ENABLE_TRANSFER_CONFIRMATIONS: true,
    ENABLE_RATE_LIMITING: true,
    ENABLE_INPUT_SANITIZATION: true,
    ENABLE_AUDIO_CACHING: true,
    ENABLE_ERROR_BOUNDARY: true
  },
  
  // API Endpoints
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    VERIFY: '/api/auth/verify',
    BANKING_CHAT: '/api/chat/banking',
    ADVISOR_CHAT: '/api/chat/financial-advisor',
    TTS: '/api/tts',
    HEALTH: '/api/health'
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
  CONFIG.ENABLE_DEBUG_LOGGING = false;
  CONFIG.MOCK_MODE = false;
  CONFIG.ENABLE_TRANSFER_DEBUG = false;
}

// Validation function for required environment variables
export function validateEnvironment() {
  const requiredEnvVars = {
    JWT_SECRET: { 
      minLength: CONFIG.JWT_MIN_SECRET_LENGTH, 
      description: 'JWT signing secret' 
    },
    GOOGLE_CLOUD_PROJECT_ID: { 
      required: false, 
      description: 'Google Cloud project ID for Dialogflow' 
    },
    OPENAI_API_KEY: { 
      required: false, 
      description: 'OpenAI API key for financial advisor' 
    },
    ELEVENLABS_API_KEY: { 
      required: false, 
      description: 'ElevenLabs API key for TTS' 
    }
  };

  const errors = [];
  const warnings = [];

  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];
    
    if (!value) {
      if (config.required !== false) {
        errors.push(`${key} is required but not set`);
      } else {
        warnings.push(`${key} not set - ${config.description} will be unavailable`);
      }
    } else if (config.minLength && value.length < config.minLength) {
      errors.push(`${key} must be at least ${config.minLength} characters long`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`  • ${error}`));
    throw new Error('Invalid environment configuration');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => console.warn(`  • ${warning}`));
  }

  if (CONFIG.ENABLE_DEBUG_LOGGING) {
    console.log('✅ Environment validation passed');
  }
}

export default CONFIG;