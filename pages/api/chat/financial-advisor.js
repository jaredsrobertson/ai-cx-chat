import { OpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createApiHandler } from '@/lib/apiUtils';
import { sanitizeInput } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

export const config = {
  runtime: 'edge',
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sanitizeMessages = (messages) => {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(msg => msg && typeof msg === 'object' && msg.role && msg.content)
    .map(msg => ({
      role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
      content: sanitizeInput(msg.content, CONFIG.MAX_ADVISOR_MESSAGE_LENGTH)
    }))
    .filter(msg => msg.content.length > 0)
    .slice(-CONFIG.MAX_CONVERSATION_HISTORY);
};

const advisorHandler = async (req) => {
  try {
    const { messages } = await req.json();
    const sanitizedMessages = sanitizeMessages(messages);

    if (sanitizedMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'Valid messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: `
        You are a helpful AI customer experience chat bot for a corporate bank.
        Your goal is to answer questions and provide tips related to basic, general personal finance.
        Follow these rules strictly:
        1. Keep your entire response concise and easy to understand.
        2. Do not use bullet points or numbered lists.
        3. Your tone should be light, encouraging, and educational.
        4. Frame your answer so it can be spoken aloud in under 20 seconds.
      `,
      messages: sanitizedMessages,
      maxTokens: 70,
    });

    return result.toAIStreamResponse();

  } catch (error) {
    logger.error('Financial advisor stream error:', error);
    return new Response(JSON.stringify({ error: CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export default createApiHandler(advisorHandler, {
  allowedMethods: ['POST'],
  rateLimit: () => ({ max: CONFIG.MAX_REQUESTS_PER_MINUTE.ADVISOR, window: 60000 })
});