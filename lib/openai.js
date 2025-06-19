// A simplified service for interacting with the OpenAI API
class OpenAIService {
  constructor() {
    // Dynamically import the OpenAI library to avoid issues in environments without the dependency
    try {
      const OpenAI = require('openai');
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key not found.");
      }
    } catch (e) {
      console.warn("OpenAI client could not be initialized. Financial Advisor will use mock data.", e.message);
      this.mockMode = true;
    }
  }
  
  // Primary method for getting financial advice via a stream
  async getFinancialAdviceStream(conversationHistory, stream) {
    if (this.mockMode) {
      const mockResponse = this.getMockResponse(conversationHistory.slice(-1)[0].content);
      // Simulate a stream for mock mode
      stream.write(`data: ${JSON.stringify({ content: mockResponse })}\n\n`);
      return;
    }
    
    const systemPrompt = `
      You are an expert financial advisor AI named AI Advisor.
      You are helpful, knowledgeable, and provide clear financial advice.
      IMPORTANT: Your responses must be concise and to the point. Avoid long, verbose explanations unless the user asks for more detail. Keep your answers simple.
      Always include a disclaimer that you are not a licensed financial advisor and this is not financial advice when discussing investments.
    `;
    
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory
    ];
    
    const openaiStream = await this.openai.chat.completions.create({
      model: "o4-mini",
      messages: messages,
      stream: true,
    });

    for await (const chunk of openaiStream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        // Stream each piece of content as a JSON object
        stream.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
  }

  // Simplified mock/fallback response
  getMockResponse(query) {
    query = query.toLowerCase();
    if (query.includes("budget")) return "A great starting point for budgeting is the 50/30/20 rule: 50% of your income for needs, 30% for wants, and 20% for savings.";
    if (query.includes("invest")) return "As an AI, I must remind you this isn't licensed financial advice. A common starting point for beginners is a diversified portfolio of low-cost index funds.";
    return "I can help with that. What specific financial questions do you have?";
  }
}

const openAIService = new OpenAIService();
export default openAIService;