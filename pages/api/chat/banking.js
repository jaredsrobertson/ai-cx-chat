import jwt from 'jsonwebtoken';
import dialogflowService from '../../../lib/dialogflow';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    let { message, sessionId } = req.body;
    if (!sessionId) {
      sessionId = uuidv4();
    }
  
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    let userContext = { user: null };
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userContext.user = decoded;
      } catch (error) {
        console.warn('Invalid token provided to banking API:', error.message);
      }
    }

    const dialogflowResponse = await dialogflowService.detectIntent(sessionId, message);
    
    // Pass the entire response object to the handler for consistent processing
    const bankingResponse = await dialogflowService.handleBankingIntent(
      dialogflowResponse,
      userContext
    );

    return res.status(200).json({ 
      success: true, 
      data: {
        response: bankingResponse,
        sessionId: dialogflowResponse.session?.split('/').pop() || sessionId 
      }
    });

  } catch (error) {
    console.error('Banking chat error:', error);
    return res.status(500).json({
      success: false,
      error: "I'm having trouble connecting to my services right now."
    });
  }
}