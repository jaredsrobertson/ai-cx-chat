import OpenAI from 'openai';

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.financialAdvisorPrompt = `You are a knowledgeable and friendly financial advisor AI assistant. Your role is to provide helpful, accurate, and personalized financial guidance to users. Follow these guidelines:

PERSONALITY:
- Be warm, approachable, and encouraging
- Use clear, jargon-free language that anyone can understand
- Show empathy for financial concerns and challenges
- Be supportive of users' financial goals and situations

EXPERTISE AREAS:
- Budgeting strategies and techniques
- Saving and emergency fund planning
- Investment basics and portfolio diversification
- Debt management and payoff strategies
- Retirement planning fundamentals
- Insurance and risk management
- Credit score improvement
- Tax planning basics
- Financial goal setting

RESPONSE GUIDELINES:
- Keep responses concise but comprehensive (2-4 paragraphs max)
- Provide actionable advice when possible
- Ask follow-up questions to better understand the user's situation
- Acknowledge when professional advice might be needed
- Never provide specific investment recommendations or guarantee returns
- Always emphasize the importance of personal research and professional consultation

TONE:
- Professional yet conversational
- Encouraging and non-judgmental
- Educational and informative
- Supportive of financial wellness

Remember: You're providing general financial education and guidance, not personalized financial advice. Always encourage users to consult with qualified financial professionals for major financial decisions.`;
  }

  async getFinancialAdvice(userMessage, conversationHistory = []) {
    try {
      // Build conversation context
      const messages = [
        {
          role: 'system',
          content: this.financialAdvisorPrompt
        },
        ...conversationHistory.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        {
          role: 'user',
          content: userMessage
        }
      ];

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      return {
        response: completion.choices[0].message.content,
        usage: completion.usage,
        success: true
      };

    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      // Provide fallback responses for common topics
      return {
        response: this.getFallbackResponse(userMessage),
        success: false,
        error: error.message
      };
    }
  }

  getFallbackResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('budget')) {
      return "Creating a budget is one of the most important steps in financial wellness! A popular approach is the 50/30/20 rule: allocate 50% of your income to needs (rent, utilities, groceries), 30% to wants (entertainment, dining out), and 20% to savings and debt repayment. Start by tracking your spending for a month to see where your money actually goes, then adjust from there. Would you like specific tips for any category?";
    }
    
    if (message.includes('save') || message.includes('emergency')) {
      return "Building an emergency fund is crucial for financial security! Start with a goal of $1,000 as a starter emergency fund, then work toward 3-6 months of expenses. Even saving $25-50 per month makes a difference. Consider automating transfers to a high-yield savings account to make saving effortless. The key is consistency, not the amount. What's your current saving situation?";
    }
    
    if (message.includes('invest')) {
      return "Investing can be a powerful way to build long-term wealth! For beginners, consider starting with low-cost index funds that track the overall market - they provide instant diversification and typically outperform actively managed funds over time. The key principles are: start early, invest regularly, diversify your holdings, and think long-term. Before investing, make sure you have an emergency fund and have paid off high-interest debt. What's your investment timeline and risk comfort level?";
    }
    
    if (message.includes('debt')) {
      return "Managing debt effectively can free up money for your other financial goals! Two popular strategies are the debt avalanche (pay minimums on all debts, put extra money toward the highest interest rate debt) and the debt snowball (pay minimums on all debts, put extra money toward the smallest balance for motivation). Also consider debt consolidation if it lowers your interest rates. The most important thing is to stop taking on new debt while paying off existing debt. What type of debt are you dealing with?";
    }
    
    if (message.includes('credit')) {
      return "Building good credit opens doors to better interest rates and financial opportunities! Key factors that affect your credit score: payment history (35%), credit utilization (30%), length of credit history (15%), types of credit (10%), and new credit inquiries (10%). Pay all bills on time, keep credit card balances below 30% of limits (ideally under 10%), and avoid closing old credit cards. Consider checking your credit report annually for errors. What specific aspect of credit building interests you most?";
    }
    
    return "I'm here to help with your financial questions! I can provide guidance on budgeting, saving, investing, debt management, credit building, and more. While I'm experiencing some technical difficulties right now, I'd be happy to discuss any specific financial topic you're interested in. What would you like to know more about?";
  }

  // Streaming response for real-time chat (future enhancement)
  async streamFinancialAdvice(userMessage, conversationHistory = []) {
    try {
      const messages = [
        {
          role: 'system',
          content: this.financialAdvisorPrompt
        },
        ...conversationHistory.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        {
          role: 'user',
          content: userMessage
        }
      ];

      const stream = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        stream: true,
      });

      return stream;

    } catch (error) {
      console.error('OpenAI Streaming Error:', error);
      throw error;
    }
  }

  // Helper method to analyze financial topics
  categorizeFinancialQuery(message) {
    const categories = {
      budgeting: ['budget', 'spending', 'expense', 'income', 'money management'],
      saving: ['save', 'savings', 'emergency fund', 'nest egg'],
      investing: ['invest', 'stock', 'bond', 'portfolio', 'retirement', '401k', 'ira'],
      debt: ['debt', 'loan', 'credit card', 'mortgage', 'pay off'],
      credit: ['credit score', 'credit report', 'credit building', 'credit history'],
      insurance: ['insurance', 'coverage', 'policy', 'protect'],
      taxes: ['tax', 'deduction', 'refund', 'irs'],
      general: ['financial', 'money', 'advice', 'help', 'planning']
    };

    const lowerMessage = message.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }
}

// Export singleton instance
const openAIService = new OpenAIService();
export default openAIService;