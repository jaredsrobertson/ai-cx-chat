import { OpenAIService } from '@/lib/openai';
import { createApiHandler } from '@/lib/apiUtils';
import { sanitizeInput } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

export const config = {
  runtime: 'edge',
};

const openAIService = new OpenAIService();

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

const advisorHandler = async (req, res) => {
  const body = await req.json();
  const { messages } = body;

  const sanitizedMessages = sanitizeMessages(messages);

  if (sanitizedMessages.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'Valid messages are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const lastMessage = sanitizedMessages[sanitizedMessages.length - 1];
  if (lastMessage && lastMessage.content) {
    const suspiciousPatterns = [
      /how to hack/i,
      /illegal/i,
      /scam/i,
      /fraud/i,
      /money laundering/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(lastMessage.content))) {
      return new Response(JSON.stringify({
        success: false,
        error: 'I can only provide legitimate financial advice.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const stream = await openAIService.getFinancialAdviceStream(sanitizedMessages);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });
  } catch (error) {
    logger.error('Financial advisor stream error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export default createApiHandler(advisorHandler, {
  allowedMethods: ['POST'],
  // Pass rateLimit as a function to defer evaluation
  rateLimit: () => ({ max: CONFIG.MAX_REQUESTS_PER_MINUTE.ADVISOR, window: 60000 })
});