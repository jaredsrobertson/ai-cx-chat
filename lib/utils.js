import { CONFIG } from './config';

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

// ==================== HELPER FUNCTIONS ====================
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}