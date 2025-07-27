import { OpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createApiHandler } from '@/lib/apiUtils';
import { knowledgeBase } from '@/lib/knowledgeBase';
import { sanitizeInput } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

export const config = {
  runtime: 'edge',
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const knowledgeHandler = async (req) => {
  try {
    const { message } = await req.json();
    const sanitizedMessage = sanitizeInput(message);

    if (!sanitizedMessage) {
      return new Response(JSON.stringify({ error: 'Valid message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const relevantDoc = knowledgeBase.find(doc =>
      sanitizedMessage.toLowerCase().includes(doc.topic.toLowerCase())
    ) || knowledgeBase[0];
    
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: `You are a helpful Knowledge Base Assistant for CloudBank. Your role is to answer user questions based *only* on the provided context. Do not use any outside information. If the answer is not in the context, say "I do not have information on that topic."

      Context:
      ---
      ${relevantDoc.content}
      ---
      `,
      messages: [{ role: 'user', content: sanitizedMessage }],
    });

    return result.toAIStreamResponse();

  } catch (error) {
    logger.error('Knowledge base stream error:', error);
    return new Response(JSON.stringify({ error: CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export default createApiHandler(knowledgeHandler);