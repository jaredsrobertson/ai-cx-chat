import { createApiHandler, createStandardResponse } from '@/lib/apiUtils';
import { knowledgeBase } from '@/lib/knowledgeBase';
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

const knowledgeHandler = async (req) => {
  const body = await req.json();
  const { message } = body;
  const sanitizedMessage = sanitizeInput(message);

  if (!sanitizedMessage) {
    return new Response(JSON.stringify(createStandardResponse(false, null, 'Valid message is required')), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const relevantDoc = knowledgeBase.find(doc =>
    sanitizedMessage.toLowerCase().includes(doc.topic.toLowerCase())
  ) || knowledgeBase[0];

  const systemPrompt = `You are a helpful Knowledge Base Assistant for CloudBank. Your role is to answer user questions based *only* on the provided context. Do not use any outside information. If the answer is not in the context, say "I do not have information on that topic."

  Context:
  ---
  ${relevantDoc.content}
  ---
  `;

  try {
    const completion = await getOpenAICompletion(
      [{ role: 'user', content: sanitizedMessage }],
      systemPrompt
    );
    const stream = OpenAIStream(completion);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });
  } catch (error) {
    logger.error('Knowledge base stream error:', error);
    const errorResponse = createStandardResponse(false, null, CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR);
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export default createApiHandler(knowledgeHandler);