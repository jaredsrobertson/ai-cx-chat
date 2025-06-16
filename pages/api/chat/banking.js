import jwt from 'jsonwebtoken';
import dialogflowService from '../../../lib/dialogflow';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // --- FIX: Get user context from JWT token, not from a file import ---
  let userContext = { user: null };
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      // The user object, including accounts, is stored in the token's payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userContext.user = decoded; // The entire decoded payload is the user object
    } catch (error) {
      console.log('Invalid token provided to banking API:', error.message);
    }
  }

  try {
    const sessionId = `banking-${Date.now()}`;
    const dialogflowResponse = await dialogflowService.detectIntent(sessionId, message);
    
    // Handle the banking intent using the user context from the token
    const bankingResponse = await dialogflowService.handleBankingIntent(
      dialogflowResponse.intentName,
      dialogflowResponse.parameters,
      userContext
    );

    return res.status(200).json({ response: bankingResponse.text });

  } catch (error) {
    console.error('Banking chat error:', error);
    return res.status(500).json({
      response: "I'm having trouble connecting to my services right now. Please try again in a moment.",
      error: 'Dialogflow processing failed'
    });
  }
}