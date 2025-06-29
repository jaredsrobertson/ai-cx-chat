import OpenAI from 'openai';

class OpenAIService {
  constructor() {
    this.openai = null;
    this.mockMode = false;
    
    if (!process.env.OPENAI_API_KEY) {
      console.warn(
        "OpenAI API key not found. The 'AI Advisor' will run in mock mode."
      );
      this.mockMode = true;
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async classifyIntent(queryText) {
    if (this.mockMode) return 'None';

    const systemPrompt = `
      You are an intent classifier for a banking assistant. The user's input may contain typos.
      Analyze the user's text and respond with ONLY ONE of the following category names, or "None" if it doesn't match.
      Be lenient with spelling. For example, 'transations' should be 'transaction.history'.

      Categories:
      - account.balance: User wants their account balance.
      - account.transfer: User wants to transfer money.
      - transaction.history: User wants to see their transaction history.
      - agent.handoff: User wants to speak to a human.
    `;
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: queryText }
        ],
        temperature: 0.1,
        max_tokens: 20,
      });
      
      const intent = response.choices[0].message.content.trim();
      const validIntents = ['account.balance', 'transaction.history', 'account.transfer', 'agent.handoff'];
      
      console.log(`OpenAI classified "${queryText}" as "${intent}"`);
      
      return validIntents.includes(intent) ? intent : 'None';
    } catch (error) {
      console.error("Error classifying intent with OpenAI:", error);
      return 'None';
    }
  }

  async getFinancialAdviceStream(messages) {
    if (this.mockMode) {
      const mockResponse = "In mock mode: Saving money is wise. Start by creating a budget to track your income and expenses. This will help you see where your money is going and identify areas where you can cut back. Remember, this is general advice, not a substitute for a professional financial consultation.";
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(mockResponse));
          controller.close();
        },
      });
      return stream;
    }

    const systemPrompt = `
      You are a helpful AI financial assistant. Your goal is to provide general financial advice in a way that is easy to digest.

      Follow these rules strictly:
      1. Keep your entire response to a maximum of 4 sentences.
      2. Do not use bullet points or numbered lists.
      3. Your tone should be light, encouraging, and educational.
      4. Frame your answer so it can be spoken aloud in 15-20 seconds.
      5. Crucially, you must include a disclaimer that you are not a licensed financial advisor and your advice is for informational purposes only.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_completion_tokens: 150,
      });
      
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          try {
            for await (const chunk of response) {
              const content = chunk.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            }
          } catch (streamError) {
            console.error('Streaming error:', streamError);
            controller.enqueue(encoder.encode('I apologize, but I encountered an error. Please try again.'));
          } finally {
            controller.close();
          }
        },
      });
      
      return stream;

    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      const mockErrorResponse = "I'm currently unable to connect to the AI Advisor service. Please try again shortly.";
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(mockErrorResponse));
          controller.close();
        },
      });
      return stream;
    }
  }
}

export { OpenAIService };