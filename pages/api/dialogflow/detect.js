import { createApiHandler } from '@/lib/apiUtils';
import { detectIntent } from '@/lib/dialogflow';
import { logger } from '@/lib/logger';

const detectHandler = async (req, res) => {
  const { message, sessionId, token } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({ success: false, error: 'Message and sessionId are required' });
  }

  try {
    // Log what we're sending to Dialogflow
    logger.debug('Sending to Dialogflow:', {
      message: message.substring(0, 50),
      sessionId,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
    });

    const queryResult = await detectIntent(sessionId, message, token);
    
    // Log what we got back
    logger.debug('Received from Dialogflow:', {
      intent: queryResult.intent?.displayName,
      hasWebhookResponse: !!queryResult.fulfillmentMessages?.length,
      webhookLatency: queryResult.diagnosticInfo?.fields?.webhook_latency_ms?.numberValue
    });

    return res.status(200).json({ success: true, data: queryResult });
  } catch (error) {
    logger.error('Error in detectIntent API route:', error);
    return res.status(500).json({ success: false, error: "Failed to communicate with Dialogflow" });
  }
};

export default createApiHandler(detectHandler, {
  allowedMethods: ['POST'],
});