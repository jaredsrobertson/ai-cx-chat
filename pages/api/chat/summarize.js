import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createApiHandler, createStandardResponse } from '@/lib/apiUtils';
import { sanitizeInput } from '@/lib/utils';
import { logger } from '@/lib/logger';

export const config = {
  runtime: 'edge',
};

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const summarizeHandler = async (req) => {
  try {
    const { messages, user } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify(createStandardResponse(false, null, 'Message history is required')), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sanitizedHistory = messages.map(msg => 
      `[${msg.author === 'user' ? 'Customer' : 'Bot'}]: ${sanitizeInput(msg.content.speakableText || msg.content)}`
    ).join('\n');

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      prompt: `
        You are an expert at summarizing customer service chats for a human agent.
        The customer, ${user ? user.name : 'a guest'}, needs help.
        Review the following conversation and provide a concise, one-sentence summary of the customer's primary goal.
        
        Conversation History:
        ---
        ${sanitizedHistory}
        ---

        Summary for Agent:
      `,
    });

    return result.toAIStreamResponse();
    
  } catch (error) {
    logger.error('Summarization stream error:', error);
    const errorResponse = createStandardResponse(false, null, 'Failed to generate summary.');
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export default createApiHandler(summarizeHandler);