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

const analyzeHandler = async (req) => {
  const body = await req.json();
  const { message } = body;
  const sanitizedMessage = sanitizeInput(message, 500);

  if (!sanitizedMessage) {
    return new Response(JSON.stringify(createStandardResponse(false, null, 'A message to analyze is required')), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const systemPrompt = `
    You are an AI assistant performing real-time conversation analysis for a banking chatbot.
    Your task is to analyze the user's message and return a JSON object with two keys: "intent" and "sentiment".

    - "intent": Classify the user's primary goal from the following options: 
      ["CheckBalance", "TransferFunds", "ViewTransactions", "AgentRequest", "FinancialAdvice", "GeneralInquiry", "Greeting", "Closing", "Other"].
    - "sentiment": Classify the user's sentiment from the following options: 
      ["Positive", "Negative", "Neutral"].

    Only return the JSON object, with no additional text or explanation.

    Example:
    User Message: "I need to see my recent transactions"
    {
      "intent": "ViewTransactions",
      "sentiment": "Neutral"
    }
  `;

  try {
    const completion = await getOpenAICompletion(
      [{ role: 'user', content: sanitizedMessage }],
      systemPrompt,
      { max_tokens: 100, temperature: 0.1 }
    );
    const stream = OpenAIStream(completion);
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });
  } catch (error) {
    logger.error('Analysis stream error:', error);
    const errorResponse = createStandardResponse(false, null, 'Failed to analyze message.');
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export default createApiHandler(analyzeHandler, {
  allowedMethods: ['POST'],
});