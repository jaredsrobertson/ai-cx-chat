import { getOpenAICompletion } from '@/lib/openai';
import { createApiHandler, createStandardResponse, OpenAIStream } from '@/lib/apiUtils';
import { sanitizeInput } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

export const config = {
  runtime: 'edge',
};

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
  const body = await req.json();
  const { messages } = body;
  const sanitizedMessages = sanitizeMessages(messages);

  if (sanitizedMessages.length === 0) {
    return new Response(JSON.stringify(createStandardResponse(false, null, 'Valid messages are required')), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const systemPrompt = `
      You are a helpful AI customer experience chat bot for a corporate bank.
      Your goal is to answer questions and provide tips related to basic, general personal finance.
      Follow these rules strictly:
      1. Keep your entire response concise and easy to understand.
      2. Do not use bullet points or numbered lists.
      3. Your tone should be light, encouraging, and educational.
      4. Frame your answer so it can be spoken aloud in under 20 seconds.
    `;

  try {
    const completion = await getOpenAICompletion(sanitizedMessages, systemPrompt, { max_tokens: 70 });
    const stream = OpenAIStream(completion);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    logger.error('Financial advisor stream error:', error);
    const errorResponse = createStandardResponse(false, null, CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR);
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export default createApiHandler(advisorHandler, {
  allowedMethods: ['POST'],
  rateLimit: () => ({ max: CONFIG.MAX_REQUESTS_PER_MINUTE.ADVISOR, window: 60000 })
});