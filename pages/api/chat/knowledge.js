// In pages/api/chat/knowledge.js (New File)
import { createApiHandler } from '@/lib/apiUtils';
import { knowledgeBase } from '@/lib/knowledgeBase';
import { getFinancialAdviceStream } from '@/lib/openai';
import { sanitizeInput } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

export const config = {
  runtime: 'edge',
};

const knowledgeHandler = async (req) => {
  const body = await req.json();
  const { message } = body;

  const sanitizedMessage = sanitizeInput(message);
  if (!sanitizedMessage) {
    return new Response(JSON.stringify({ success: false, error: 'Valid message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Simple RAG: Find the most relevant document from our knowledge base
  const relevantDoc = knowledgeBase.find(doc =>
    sanitizedMessage.toLowerCase().includes(doc.topic.toLowerCase())
  ) || knowledgeBase[0]; // Fallback to the first doc

  const systemPrompt = `You are a helpful Knowledge Base Assistant for CloudBank. Your role is to answer user questions based *only* on the provided context. Do not use any outside information. If the answer is not in the context, say "I do not have information on that topic."

  Context:
  ---
  ${relevantDoc.content}
  ---
  `;

  try {
    const stream = await getFinancialAdviceStream([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: sanitizedMessage }
    ]);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });
  } catch (error) {
    logger.error('Knowledge base stream error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export default createApiHandler(knowledgeHandler);