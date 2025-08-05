import { createApiHandler, createStandardResponse } from '@/lib/apiUtils';
import { detectIntent } from '@/lib/dialogflow';
import { logger } from '@/lib/logger';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { CONFIG } from '@/lib/config';
import { sanitizeInput } from '@/lib/utils';
import { knowledgeBase } from '@/lib/knowledgeBase';
// dialogflowUtils is no longer needed here as parsing is handled by the webhook.

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleBankingBot(req, user) {
    const { message, sessionId } = req.body;
    
    // We no longer need to pass user data to Dialogflow.
    const queryResult = await detectIntent(sessionId, message);
    const intentName = queryResult.intent?.displayName;

    if (CONFIG.AUTH_REQUIRED_INTENTS.includes(intentName) && !user) {
        return createStandardResponse(true, { action: 'AUTH_REQUIRED', intentName });
    }

    // If the intent requires a webhook, call our banking API with the user's token.
    if (queryResult.webhookSource) {
        const token = req.headers.authorization?.substring(7);
        const webhookResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/chat/banking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ queryResult }) // Forward the corrected Dialogflow result
        });

        if (!webhookResponse.ok) {
            throw new Error('Banking webhook failed');
        }
        const webhookData = await webhookResponse.json();
        return webhookData; // Forward the clean JSON response to the client
    }
    
    // If no webhook is needed, return Dialogflow's static response.
    return createStandardResponse(true, { speakableText: queryResult.fulfillmentText });
}

async function handleAdvisorBot(req) {
    const { messages } = req.body;
    const systemPrompt = `You are a helpful AI customer experience chat bot for a corporate bank. Your goal is to answer questions and provide tips related to basic, general personal finance. Follow these rules strictly: 1. Keep your entire response concise and easy to understand. 2. Do not use bullet points or numbered lists. 3. Your tone should be light, encouraging, and educational. 4. Frame your answer so it can be spoken aloud in under 20 seconds.`;
    
    const sanitizedMessages = messages.map(m => ({ 
        role: m.role, 
        content: sanitizeInput(m.content) 
    }));

    const result = await streamText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt,
        messages: sanitizedMessages,
        maxTokens: 70,
    });
    return result.toAIStreamResponse();
}

function getRelevantContext(message) {
  const lowerCaseMessage = message.toLowerCase();
  const relevantDoc = knowledgeBase.find(doc =>
    lowerCaseMessage.includes(doc.topic.toLowerCase())
  );
  return relevantDoc ? relevantDoc.content : "I do not have information on that topic.";
}

async function handleKnowledgeBot(req) {
    const { message } = req.body;
    const relevantContext = getRelevantContext(message);
    const systemPrompt = `You are a helpful Knowledge Base Assistant for CloudBank. Your role is to answer user questions based *only* on the provided context. Do not use any outside information. If the answer is not in the context, say "I do not have information on that topic."\n\nContext:\n---\n${relevantContext}\n---`;

    const result = await streamText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
        maxTokens: 100,
    });
    return result.toAIStreamResponse();
}

const messageHandler = async (req, res, user) => {
    const { botId } = req.body;

    try {
        if (botId === 'banking') {
            const response = await handleBankingBot(req, user);
            return res.status(200).json(response);
        }
        
        if (botId === 'advisor') {
            return handleAdvisorBot(req);
        }
        
        if (botId === 'knowledge') {
            return handleKnowledgeBot(req);
        }

        return res.status(400).json(createStandardResponse(false, null, 'Invalid botId provided.'));

    } catch (error) {
        logger.error('Error in message handler', error);
        return res.status(500).json(createStandardResponse(false, null, "Failed to process message."));
    }
};

export default createApiHandler(messageHandler, {
    allowedMethods: ['POST'],
});