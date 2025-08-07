import { createApiHandler, createStandardResponse } from '@/lib/apiUtils';
import { detectIntent } from '@/lib/dialogflow';
import { logger } from '@/lib/logger';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { CONFIG } from '@/lib/config';
import { sanitizeInput } from '@/lib/utils';
import { knowledgeBase } from '@/lib/knowledgeBase';
import { parseDialogflowResponse } from '@/lib/dialogflowUtils';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleBankingBot(req, res, user) {
  const { message, sessionId } = req.body;
  
  try {
    // Call Dialogflow to detect intent
    const queryResult = await detectIntent(sessionId, message);
    const intentName = queryResult.intent?.displayName;
    
    logger.info('Dialogflow intent detected', { 
      intentName, 
      webhookUsed: queryResult.webhookSource,
      hasUser: !!user 
    });
    
    // Check if this intent requires authentication
    const requiresAuth = CONFIG.AUTH_REQUIRED_INTENTS.includes(intentName);
    
    if (requiresAuth && !user) {
      logger.info('Auth required for intent', { intentName });
      return createStandardResponse(true, { 
        action: 'AUTH_REQUIRED', 
        intentName,
        speakableText: "Please log in to continue with this request."
      });
    }
    
    // Check if webhook should be called
    if (queryResult.webhookSource || requiresAuth) {
      logger.debug('Calling banking webhook', { intentName });
      
      // Prepare the webhook request
      const webhookUrl = `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/chat/banking`;
      const token = req.headers.authorization?.substring(7);
      
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ 
          queryResult,
          session: sessionId
        })
      });
      
      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        logger.error('Banking webhook failed', { 
          status: webhookResponse.status, 
          error: errorText 
        });
        throw new Error('Banking webhook failed');
      }
      
      const webhookData = await webhookResponse.json();
      
      // Handle agent handoff specially
      if (webhookData.data?.action === 'AGENT_HANDOFF') {
        return createStandardResponse(true, {
          action: 'AGENT_HANDOFF',
          speakableText: webhookData.data.speakableText
        });
      }
      
      // Return the webhook data
      return webhookData;
    }
    
    // No webhook needed, return Dialogflow's static response
    return createStandardResponse(true, { 
      speakableText: queryResult.fulfillmentText 
    });
    
  } catch (error) {
    logger.error('Error in banking bot handler', error);
    return createStandardResponse(false, null, "I'm having trouble processing your request. Please try again.");
  }
}

async function handleAdvisorBot(req) {
  const { messages } = req.body;
  const systemPrompt = `You are a helpful AI financial advisor for CloudBank. Provide concise, practical financial advice. Keep responses under 100 words and conversational.`;
  
  const sanitizedMessages = messages
    .slice(-10) // Limit context
    .map(m => ({ 
      role: m.role, 
      content: sanitizeInput(m.content, 500) 
    }));
  
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages: sanitizedMessages,
    maxTokens: 100,
  });
  
  return result.toAIStreamResponse();
}

async function handleKnowledgeBot(req) {
  const { message } = req.body;
  const relevantContext = getRelevantContext(message);
  
  const systemPrompt = `You are CloudBank's Knowledge Base Assistant. Answer based only on this context: ${relevantContext}`;
  
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
    maxTokens: 100,
  });
  
  return result.toAIStreamResponse();
}

function getRelevantContext(message) {
  const lowerMessage = message.toLowerCase();
  const relevant = knowledgeBase.find(kb => 
    lowerMessage.includes(kb.topic.toLowerCase())
  );
  return relevant ? relevant.content : "I don't have specific information on that topic.";
}

const messageHandler = async (req, res, user) => {
  const { botId } = req.body;
  
  try {
    logger.debug('Message handler called', { botId, hasUser: !!user });
    
    switch (botId) {
      case 'banking':
        const response = await handleBankingBot(req, res, user);
        return res.status(200).json(response);
        
      case 'advisor':
        return handleAdvisorBot(req);
        
      case 'knowledge':
        return handleKnowledgeBot(req);
        
      default:
        return res.status(400).json(
          createStandardResponse(false, null, 'Invalid botId')
        );
    }
  } catch (error) {
    logger.error('Message handler error', error);
    return res.status(500).json(
      createStandardResponse(false, null, "Failed to process message")
    );
  }
};

export default createApiHandler(messageHandler, {
  allowedMethods: ['POST'],
  requireAuth: false // Handle auth per intent
});