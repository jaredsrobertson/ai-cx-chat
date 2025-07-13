import OpenAI from 'openai';
import { logger } from './logger';
import { CONFIG } from './config'; // Import CONFIG for error messages

let openai;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  // Log a warning during server startup if the key is missing
  logger.warn("OpenAI API key not found. The 'AI Advisor' feature will be unavailable and will return an error.");
}

// This function is no longer needed as we'll handle intent classification differently.
// export async function classifyIntent(queryText) { ... }

export async function getFinancialAdviceStream(messages) {
  if (!openai) {
    logger.error("getFinancialAdviceStream called but OpenAI client is not initialized.");
    // Return a readable stream that immediately sends an error message and closes.
    return new Response(JSON.stringify({
        success: false,
        error: CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR
    }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }

  const systemPrompt = `
      You are a helpful AI customer experience chat bot for a corporate bank.
      Your goal is to answer questions and provide tips related to basic, general personal finance.

      Follow these rules strictly:
      1. Keep your entire response concise and easy to understand.
      2. Do not use bullet points or numbered lists.
      3. Your tone should be light, encouraging, and educational.
      4. Frame your answer so it can be spoken aloud in under 20 seconds.
    `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 70,
    });

    // Directly return the stream from the OpenAI SDK
    return response.toReadableStream();

  } catch (error) {
    logger.error("Error calling OpenAI API", error);
    // Re-throw the error to be handled by the API handler's try-catch block
    throw new Error(CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR);
  }
}