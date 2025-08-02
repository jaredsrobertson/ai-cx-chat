import { createOpenAI } from '@ai-sdk/openai';
import { streamObject } from 'ai';
import { z } from 'zod';
import { createApiHandler, createStandardResponse } from '@/lib/apiUtils';
import { sanitizeInput } from '@/lib/utils';
import { logger } from '@/lib/logger';

export const config = {
  runtime: 'edge',
};

// Correctly instantiate the OpenAI client
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const analyzeHandler = async (req) => {
  try {
    const { message } = await req.json();
    const sanitizedMessage = sanitizeInput(message, 500);

    if (!sanitizedMessage) {
      return new Response(JSON.stringify(createStandardResponse(false, null, 'A message to analyze is required')), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await streamObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        intent: z.enum(["CheckBalance", "TransferFunds", "ViewTransactions", "AgentRequest", "FinancialAdvice", "GeneralInquiry", "Greeting", "Closing", "Other"]),
        sentiment: z.enum(["Positive", "Negative", "Neutral"]),
      }),
      prompt: `Analyze the following user message and return a JSON object with "intent" and "sentiment" classifications: "${sanitizedMessage}"`,
    });

    // The result directly streams a JSON object.
    // The AI SDK handles the correct content-type header for the response stream.
    return new Response(result.JSONStream);

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