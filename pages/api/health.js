import { createApiHandler } from '@/lib/apiUtils';
import { logger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';
import { OpenAIService } from '@/lib/openai';
import dialogflow from '@google-cloud/dialogflow';

const ping = async (serviceName, promise) => {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000));
  try {
    await Promise.race([promise, timeout]);
    return { status: 'ok' };
  } catch (error) {
    logger.warn(`Health check ping failed for ${serviceName}`, { error: error.message });
    return { status: 'error', error: error.message };
  }
};

const healthHandler = async (req, res) => {
  const startTime = Date.now();
  
  const openaiService = new OpenAIService();
  
  const dialogflowPing = ping('Dialogflow', async () => {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_CLOUD_PROJECT_ID) {
      const sessionsClient = new dialogflow.SessionsClient();
      await sessionsClient.getProjectId();
    } else {
      throw new Error('Not configured');
    }
  });

  const openAIPing = ping('OpenAI', openaiService.openai.models.list({ limit: 1 }));

  const ttsPing = ping('ElevenLabs', fetch(`https://api.elevenlabs.io/v1/voices`, {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY || '' }
  }).then(res => {
    if (!res.ok) throw new Error(`API responded with ${res.status}`);
  }));

  const [dialogflowResult, openAIResult, ttsResult] = await Promise.all([dialogflowPing, openAIPing, ttsPing]);

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  const services = {
    dialogflow: dialogflowResult,
    openai: openAIResult,
    tts: ttsResult,
    authentication: {
      status: (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= CONFIG.JWT.MIN_SECRET_LENGTH) ? 'ok' : 'error'
    }
  };

  const issues = Object.entries(services)
    .filter(([, result]) => result.status !== 'ok')
    .map(([name, result]) => `${name} is experiencing issues` + (result.error ? `: ${result.error}` : ''));

  if (issues.length > 0) {
    health.status = 'unhealthy';
    health.issues = issues;
  }

  const response = {
    ...health,
    services,
    performance: {
      response_time_ms: Date.now() - startTime
    },
    features: CONFIG.FEATURES
  };

  logger.debug('Health check completed', { status: health.status, responseTime: response.performance.response_time_ms });

  const statusCode = health.status === 'healthy' ? 200 : 503;
  return res.status(statusCode).json(response);
};

export default createApiHandler(healthHandler, {
  allowedMethods: ['GET'],
});