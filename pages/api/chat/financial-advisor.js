import openAIService from '../../../lib/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, conversationHistory = [] } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Get financial advice from OpenAI GPT-4
    const aiResponse = await openAIService.getFinancialAdvice(message, conversationHistory);
    
    if (aiResponse.success) {
      return res.status(200).json({
        response: aiResponse.response,
        category: openAIService.categorizeFinancialQuery(message),
        usage: aiResponse.usage,
        source: 'openai'
      });
    } else {
      // Return fallback response if OpenAI fails
      return res.status(200).json({
        response: aiResponse.response,
        category: openAIService.categorizeFinancialQuery(message),
        source: 'fallback',
        error: aiResponse.error
      });
    }

  } catch (error) {
    console.error('Financial advisor error:', error);
    
    // Emergency fallback responses
    let response = "I'm your financial advisor! This will connect to OpenAI GPT-4 soon.";

    if (message.toLowerCase().includes('budget')) {
      response = "Creating a budget is essential for financial health! The 50/30/20 rule is a great starting point: 50% for needs, 30% for wants, and 20% for savings and debt repayment. Would you like me to help you create a personalized budget?";
    } else if (message.toLowerCase().includes('invest')) {
      response = "Investing is a great way to build long-term wealth! For beginners, I recommend starting with low-cost index funds that provide broad market diversification. The key is to start early, invest regularly, and think long-term. What's your investment timeline and risk tolerance?";
    } else if (message.toLowerCase().includes('save')) {
      response = "Building an emergency fund should be your first priority - aim for 3-6 months of expenses in a high-yield savings account. Even small amounts add up over time! What's your current savings goal?";
    } else if (message.toLowerCase().includes('debt')) {
      response = "For debt management, consider the debt avalanche method (pay minimums on all debts, extra on highest interest rate) or debt snowball (smallest balance first for motivation). Which approach sounds better for your situation?";
    }

    return res.status(200).json({
      response,
      category: 'general',
      source: 'fallback',
      error: 'OpenAI temporarily unavailable'
    });
  }
}