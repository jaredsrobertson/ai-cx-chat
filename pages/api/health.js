import { CONFIG, validateEnvironment, logger, createStandardResponse } from '../../lib/utils';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json(createStandardResponse(false, null, 'Method not allowed'));
  }

  const startTime = Date.now();
  
  try {
    // Basic health info
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Check service availability
    const services = {
      dialogflow: {
        available: !!(process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_APPLICATION_CREDENTIALS),
        status: process.env.GOOGLE_CLOUD_PROJECT_ID ? 'configured' : 'not_configured'
      },
      openai: {
        available: !!process.env.OPENAI_API_KEY,
        status: process.env.OPENAI_API_KEY ? 'configured' : 'mock_mode'
      },
      tts: {
        available: !!process.env.ELEVENLABS_API_KEY,
        status: process.env.ELEVENLABS_API_KEY ? 'configured' : 'not_configured'
      },
      authentication: {
        available: !!(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= CONFIG.JWT.MIN_SECRET_LENGTH),
        status: process.env.JWT_SECRET ? 'configured' : 'not_configured'
      }
    };

    // Check critical services
    if (!services.authentication.available) {
      health.status = 'unhealthy';
      health.issues = ['Authentication not properly configured'];
    }

    // Environment validation
    let envValidation = { valid: true };
    try {
      validateEnvironment();
    } catch (error) {
      envValidation.valid = false;
      envValidation.error = error.message;
      health.status = 'unhealthy';
    }

    // Performance metrics
    const memoryUsage = process.memoryUsage();
    const performance = {
      memory_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      memory_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      response_time_ms: Date.now() - startTime
    };

    const response = {
      ...health,
      services,
      environment_validation: envValidation,
      performance,
      features: CONFIG.FEATURES
    };

    logger.debug('Health check completed', { status: health.status, responseTime: performance.response_time_ms });

    const statusCode = health.status === 'healthy' ? 200 : 503;
    return res.status(statusCode).json(response);

  } catch (error) {
    logger.error('Health check failed', error);
    
    return res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message
    });
  }
}