import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import dialogflowService from '../../../lib/dialogflow';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { message, sessionId } = req.body;
  if (!sessionId) {
    sessionId = uuidv4();
  }
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  let userContext = { user: null };
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userContext.user = decoded;
    } catch (error) {
      console.log('Invalid token provided to banking API:', error.message);
    }
  }

  try {
    const dialogflowResponse = await dialogflowService.detectIntent(sessionId, message);
    
    const bankingResponse = await dialogflowService.handleBankingIntent(
      dialogflowResponse.intentName,
      dialogflowResponse.parameters,
      userContext
    );

    // Pass the entire structured response object to the client
    return res.status(200).json({ 
      response: bankingResponse, // 'response' now contains the object
      sessionId: sessionId 
    });

  } catch (error) {
    console.error('Banking chat error:', error);
    return res.status(500).json({
      response: { speakableText: "I'm having trouble connecting to my services right now." },
      error: 'Dialogflow processing failed'
    });
  }
}