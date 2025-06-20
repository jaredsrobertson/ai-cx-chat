const requiredEnvVars = {
  JWT_SECRET: { minLength: 32, description: 'JWT signing secret' },
  GOOGLE_CLOUD_PROJECT_ID: { required: false, description: 'Google Cloud project ID for Dialogflow' },
  OPENAI_API_KEY: { required: false, description: 'OpenAI API key for financial advisor' },
  ELEVENLABS_API_KEY: { required: false, description: 'ElevenLabs API key for TTS' }
};

export function validateEnvironment() {
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
    console.error('Environment validation failed:');
    errors.forEach(error => console.error(`  ❌ ${error}`));
    throw new Error('Invalid environment configuration');
  }

  if (warnings.length > 0) {
    console.warn('Environment warnings:');
    warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }

  console.log('✅ Environment validation passed');
}