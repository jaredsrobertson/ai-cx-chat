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
    
    // --- SIMPLIFIED FALLBACK ---
    // The openAIService already has robust fallbacks, so we just return a generic error here.
    return res.status(500).json({
      response: "I'm sorry, I'm having some trouble connecting to my financial knowledge base. Please try again in a moment.",
      category: 'general',
      source: 'error'
    });
  }
}