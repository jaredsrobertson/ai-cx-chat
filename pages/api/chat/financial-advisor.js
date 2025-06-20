import { OpenAIService } from '../../../lib/openai';

export const config = {
  runtime: 'edge',
};

const openAIService = new OpenAIService();

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages } = await req.json();
    const stream = await openAIService.getFinancialAdviceStream(messages);
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Financial advisor stream error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to get response from financial advisor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}