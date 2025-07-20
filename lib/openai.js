import OpenAI from 'openai';
import { logger } from './logger';
import { CONFIG } from './config';

let openai;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  logger.warn("OpenAI API key not found. AI features will be unavailable.");
}

/**
 * Creates a chat completion stream from the OpenAI API.
 * @param {Array<object>} messages - The conversation history.
 * @param {string} systemPrompt - The system prompt to guide the AI.
 * @param {object} options - Additional options for the completion.
 * @returns {Promise<object>} - The full response object from the OpenAI API.
 */
export async function getOpenAICompletion(messages, systemPrompt, options = {}) {
  if (!openai) {
    logger.error("getOpenAICompletion called but OpenAI client is not initialized.");
    throw new Error(CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR);
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 150,
    });

    return response;

  } catch (error) {
    logger.error("Error calling OpenAI API", { error: error.message });
    throw new Error(CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR);
  }
}