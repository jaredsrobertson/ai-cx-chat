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

    // SIMPLIFIED: Only classify when Dialogflow fails - basic patterns only
    const systemPrompt = `
      You are a fallback classifier for banking queries that Dialogflow missed. 
      Respond with ONLY the category name or "None".

      Categories (only these):
      - account.balance: User wants account balance
      - account.transfer: User wants to transfer money
      - transaction.history: User wants transaction history  
      - agent.handoff: User wants to speak to a person
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
      const validIntents = ['account.balance', 'account.transactions', 'account.transfer', 'agent.handoff'];
      
      // SIMPLIFIED: Map to actual Dialogflow intent names
      const intentMapping = {
        'account.transactions': 'transaction.history'
      };
      
      const mappedIntent = intentMapping[intent] || intent;
      console.log(`OpenAI classified "${queryText}" as "${intent}" → "${mappedIntent}"`);
      
      return validIntents.includes(intent) ? mappedIntent : 'None';
    } catch (error) {
      console.error("Error classifying intent with OpenAI:", error);
      return 'None';
    }
  }

  // FIXED: Add fallback intent classification using keyword patterns
  fallbackIntentClassification(queryText) {
    const text = queryText.toLowerCase().trim();
    
    // Transaction patterns
    const transactionPatterns = [
      /transaction/i, /history/i, /charges?/i, /spending/i, /purchases?/i,
      /activity/i, /recent/i, /payments?/i, /bought/i, /spent/i,
      /debits?/i, /withdrawals?/i, /what.*did.*buy/i, /show.*spent/i
    ];
    
    // Balance patterns  
    const balancePatterns = [
      /balance/i, /how much.*have/i, /money.*in/i, /account.*total/i,
      /funds/i, /available/i, /current.*amount/i
    ];
    
    // Transfer patterns
    const transferPatterns = [
      /transfer/i, /move.*money/i, /send.*money/i, /from.*to/i,
      /between.*account/i, /move.*funds/i
    ];
    
    // Agent patterns
    const agentPatterns = [
      /agent/i, /human/i, /person/i, /representative/i, /customer.*service/i,
      /speak.*to/i, /talk.*to/i, /live.*person/i
    ];

    if (transactionPatterns.some(pattern => pattern.test(text))) {
      console.log(`Fallback classification: "${queryText}" → account.transactions`);
      return 'account.transactions';
    }
    
    if (balancePatterns.some(pattern => pattern.test(text))) {
      console.log(`Fallback classification: "${queryText}" → account.balance`);
      return 'account.balance';
    }
    
    if (transferPatterns.some(pattern => pattern.test(text))) {
      console.log(`Fallback classification: "${queryText}" → account.transfer`);
      return 'account.transfer';
    }
    
    if (agentPatterns.some(pattern => pattern.test(text))) {
      console.log(`Fallback classification: "${queryText}" → agent.handoff`);
      return 'agent.handoff';
    }
    
    console.log(`Fallback classification: "${queryText}" → None`);
    return 'None';
  }

  async getFinancialAdviceStream(messages) {
    if (this.mockMode) {
      const mockResponse = "In mock mode: Saving money is wise. Start by creating a budget to track your income and expenses. This will help you see where your money is going and identify areas where you can cut back. Remember, this is general advice, not a substitute for professional financial consultation.";
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