import { createApiHandler, createStandardResponse } from '@/lib/apiUtils';
import { getOpenAICompletion } from '@/lib/openai';
import { sanitizeInput } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

export const config = {
  runtime: 'edge',
};

function OpenAIStream(completion) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      controller.close();
    },
  });
}

const summarizeHandler = async (req) => {
  const body = await req.json();
  const { messages, user } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify(createStandardResponse(false, null, 'Message history is required')), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sanitizedHistory = messages.map(msg => 
    `[${msg.author === 'user' ? 'Customer' : 'Bot'}]: ${sanitizeInput(msg.content.speakableText || msg.content)}`
  ).join('\n');

  const systemPrompt = `
    You are an expert at summarizing customer service chats for a human agent.
    The customer, ${user ? user.name : 'a guest'}, needs help.
    Review the following conversation and provide a concise, one-sentence summary of the customer's primary goal.
    
    Conversation History:
    ---
    ${sanitizedHistory}
    ---

    Summary for Agent:
  `;

  try {
    const completion = await getOpenAICompletion([], systemPrompt);
    const stream = OpenAIStream(completion);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });
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