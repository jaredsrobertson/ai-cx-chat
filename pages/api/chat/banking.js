import { v4 as uuidv4 } from 'uuid';
import dialogflowService from '../../../lib/dialogflow';
import { createApiHandler, sanitizeInput, logger, CONFIG } from '../../../lib/utils';

const bankingHandler = async (req, res, user) => {
  let { message, sessionId } = req.body;
  
  // Generate session ID if not provided
  if (!sessionId) {
    sessionId = uuidv4();
  }

  // Sanitize and validate message
  message = sanitizeInput(message, CONFIG.MAX_MESSAGE_LENGTH);
  if (!message) {
    return res.status(400).json({
      success: false,
      error: CONFIG.MESSAGES.ERRORS.MESSAGE_REQUIRED
    });
  }

  try {
    // Build user context
    const userContext = { user };

    // Process with Dialogflow
    const dialogflowResponse = await dialogflowService.detectIntent(sessionId, message);
    const bankingResponse = await dialogflowService.handleBankingIntent(
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
      data: {
        response: bankingResponse,
        sessionId: dialogflowResponse.session?.split('/').pop() || sessionId 
      }
    });

  } catch (error) {
    logger.error('Banking chat error:', error, { sessionId, messageLength: message.length });
    return res.status(500).json({
      success: false,
      error: CONFIG.MESSAGES.ERRORS.DIALOGFLOW_ERROR
    });
  }
};

// Export with middleware
export default createApiHandler(bankingHandler, {
  allowedMethods: ['POST'],
  rateLimit: { max: CONFIG.MAX_REQUESTS_PER_MINUTE.BANKING, window: 60000 }
});