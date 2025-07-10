import { v4 as uuidv4 } from 'uuid';
import { detectIntent, handleBankingIntent } from '@/lib/dialogflow';
import { createApiHandler } from '@/lib/apiUtils';
import { sanitizeInput } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

const bankingHandler = async (req, res, user) => {
  let { message, sessionId } = req.body;
  
  if (!sessionId) {
    sessionId = uuidv4();
  }

  message = sanitizeInput(message, 1000);
  if (!message) {
    return res.status(400).json({
      success: false,
      error: CONFIG.MESSAGES.ERRORS.MESSAGE_REQUIRED
    });
  }

  try {
    const userContext = { user };

    const dialogflowResponse = await detectIntent(sessionId, message);
    const bankingResponse = await handleBankingIntent(
      dialogflowResponse,
      userContext
    );

    logger.debug('Banking chat processed', {
      sessionId: sessionId.substring(0, 8) + '...',
      intent: bankingResponse.intentName,
      authenticated: !!user
    });

    return res.status(200).json({ 
      success: true, 
      response: bankingResponse,
      sessionId: dialogflowResponse.session?.split('/').pop() || sessionId 
    });

  } catch (error) {
    logger.error('Banking chat error:', error, { sessionId, messageLength: message.length });
    return res.status(500).json({
      success: false,
      error: CONFIG.MESSAGES.ERRORS.DIALOGFLOW_ERROR
    });
  }
};

export default createApiHandler(bankingHandler, {
  allowedMethods: ['POST'],
  rateLimit: { max: 20, window: 60000 }
});