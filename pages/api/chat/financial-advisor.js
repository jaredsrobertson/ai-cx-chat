import { createApiHandler, createOpenAIStreamHandler } from '@/lib/apiUtils';
import { CONFIG } from '@/lib/config';

export const config = {
  runtime: 'edge',
};

const systemPrompt = `
  You are a helpful AI customer experience chat bot for a corporate bank.
  Your goal is to answer questions and provide tips related to basic, general personal finance.
  Follow these rules strictly:
  1. Keep your entire response concise and easy to understand.
  2. Do not use bullet points or numbered lists.
  3. Your tone should be light, encouraging, and educational.
  4. Frame your answer so it can be spoken aloud in under 20 seconds.
`;

const advisorHandler = createOpenAIStreamHandler({
  systemPrompt,
  maxTokens: 70,
  errorMessage: CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR,
});

export default createApiHandler(advisorHandler, {
  allowedMethods: ['POST'],
  rateLimit: () => ({ max: CONFIG.MAX_REQUESTS_PER_MINUTE.ADVISOR, window: 60000 })
});