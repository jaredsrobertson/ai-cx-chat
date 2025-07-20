    import { createApiHandler } from '@/lib/apiUtils';
import { detectIntent } from '@/lib/dialogflow';
import { logger } from '@/lib/logger';

const detectHandler = async (req, res) => {
  const { message, sessionId, token } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({ success: false, error: 'Message and sessionId are required' });
  }

  try {
    const queryResult = await detectIntent(sessionId, message, token);
    return res.status(200).json({ success: true, data: queryResult });
  } catch (error) {
    logger.error('Error in detectIntent API route:', error);
    return res.status(500).json({ success: false, error: "Failed to communicate with Dialogflow" });
  }
};

export default createApiHandler(detectHandler, {
  allowedMethods: ['POST'],
});