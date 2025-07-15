// In pages/api/chat/summarize.js (New File)
import { createApiHandler } from '@/lib/apiUtils';
import { getFinancialAdviceStream } from '@/lib/openai'; // We can reuse this function
import { sanitizeInput } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

export const config = {
  runtime: 'edge',
};

const summarizeHandler = async (req) => {
  const body = await req.json();
  const { messages, user } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'Message history is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Sanitize the history
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
    // We can reuse the existing streaming function for this one-off completion
    const stream = await getFinancialAdviceStream([{ role: 'system', content: systemPrompt }]);
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });
  } catch (error) {
    logger.error('Summarization stream error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to generate summary.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export default createApiHandler(summarizeHandler);