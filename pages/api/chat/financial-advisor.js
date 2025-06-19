import openAIService from '../../../lib/openai';

// Tell Next.js to use the Edge Runtime for optimal streaming performance
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messageHistory } = await req.json();

    if (!messageHistory) {
      return new Response(JSON.stringify({ error: 'Message history is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a streaming response using the ReadableStream API
    const stream = new ReadableStream({
      async start(controller) {
        // A simple wrapper to abstract the controller's enqueue method
        const streamWrapper = {
          write(data) {
            controller.enqueue(new TextEncoder().encode(data));
          },
          close() {
            controller.close();
          }
        };

        try {
          await openAIService.getFinancialAdviceStream(messageHistory, streamWrapper);
        } catch (error) {
          console.error("Error during OpenAI stream:", error);
          const errorPayload = `data: ${JSON.stringify({ error: "Sorry, I encountered an error." })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorPayload));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Financial advisor API error:', error);
    return new Response(JSON.stringify({ response: "I'm having trouble connecting right now." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}