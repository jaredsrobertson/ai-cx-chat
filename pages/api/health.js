import { CONFIG, validateEnvironment } from '../../lib/config';
import { logger } from '../../lib/logger';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  
  try {
    // Basic health check data
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      node_version: process.version,
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
        available: !!(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= CONFIG.JWT_MIN_SECRET_LENGTH),
        status: process.env.JWT_SECRET ? 'configured' : 'not_configured'
      }
    };

    // Check if any critical services are down
    const criticalServices = ['authentication'];
    const downCriticalServices = criticalServices.filter(service => !services[service].available);
    
    if (downCriticalServices.length > 0) {
      health.status = 'degraded';
      health.issues = downCriticalServices.map(service => `${service} not properly configured`);
    }

    // Environment validation
    let envValidation = { valid: true, errors: [], warnings: [] };
    try {
      validateEnvironment();
    } catch (error) {
      envValidation.valid = false;
      envValidation.errors.push(error.message);
      health.status = 'unhealthy';
    }

    // Performance metrics
    const memoryUsage = process.memoryUsage();
    const performance = {
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024) // MB
      },
      response_time: Date.now() - startTime
    };

    // Feature flags
    const features = CONFIG.FEATURES;

    // System information
    const system = {
      platform: process.platform,
      architecture: process.arch,
      cpu_count: require('os').cpus().length,
      load_average: require('os').loadavg(),
      free_memory: Math.round(require('os').freemem() / 1024 / 1024), // MB
      total_memory: Math.round(require('os').totalmem() / 1024 / 1024) // MB
    };

    const response = {
      ...health,
      services,
      environment_validation: envValidation,
      performance,
      features,
      system
    };

    // Log health check request
    logger.api.request('GET', '/api/health', req.headers['x-forwarded-for'] || 'localhost');

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

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