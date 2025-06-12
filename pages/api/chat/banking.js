import jwt from 'jsonwebtoken';
import { getUserByUsername } from '../../../data/mockUsers';
import dialogflowService from '../../../lib/dialogflow';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Get user context from JWT token
  let userContext = { user: null };
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = getUserByUsername(decoded.username);
      if (user) {
        userContext.user = user;
      }
    } catch (error) {
      console.log('Invalid token:', error.message);
    }
  }

  try {
    // Generate unique session ID for Dialogflow
    const sessionId = `banking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Process with Dialogflow
    const dialogflowResponse = await dialogflowService.detectIntent(sessionId, message);
    
    // Handle the banking intent
    const bankingResponse = await dialogflowService.handleBankingIntent(
      dialogflowResponse.intentName,
      dialogflowResponse.parameters,
      userContext
    );

    // If Dialogflow has a fulfillment text and banking response doesn't require auth,
    // prefer the Dialogflow response for better natural language
    let finalResponse = bankingResponse.text;
    
    if (dialogflowResponse.fulfillmentText && !bankingResponse.requiresAuth) {
      // Use Dialogflow's fulfillment text if it's more natural
      if (dialogflowResponse.fulfillmentText.length > 20) {
        finalResponse = dialogflowResponse.fulfillmentText;
      }
    }

    return res.status(200).json({
      response: finalResponse,
      intentName: dialogflowResponse.intentName,
      confidence: dialogflowResponse.confidence,
      requiresAuth: bankingResponse.requiresAuth || false,
      suggestedActions: bankingResponse.suggestedActions || [],
      parameters: dialogflowService.extractParameters(dialogflowResponse.parameters)
    });

  } catch (error) {
    console.error('Banking chat error:', error);
    
    // Fallback to rule-based responses
    let response = "I'm here to help with your banking needs! This will connect to Dialogflow soon.";

    if (message.toLowerCase().includes('balance')) {
      if (userContext.user) {
        const { checking, savings } = userContext.user.accounts;
        response = `Your current balances are:\n• Checking: ${checking.balance.toLocaleString()}\n• Savings: ${savings.balance.toLocaleString()}`;
      } else {
        response = "I'd be happy to check your account balance! For security purposes, please log in to access your account information.";
      }
    } else if (message.toLowerCase().includes('transfer')) {
      if (userContext.user) {
        response = "I can help you transfer funds between your accounts. How much would you like to transfer and between which accounts?";
      } else {
        response = "I can help you transfer funds between your accounts! Please log in first to access this service.";
      }
    } else if (message.toLowerCase().includes('hours') || message.toLowerCase().includes('branch')) {
      response = "Our branches are open Monday-Friday 9:00 AM - 5:00 PM, Saturday 9:00 AM - 2:00 PM. We're closed on Sundays and major holidays.";
    } else if (message.toLowerCase().includes('help')) {
      response = "I'm here to help with your banking needs! I can assist you with account balances, transfers, payments, branch hours, and general banking questions. What would you like help with today?";
    }

    return res.status(200).json({
      response,
      intentName: 'fallback',
      confidence: 0.5,
      requiresAuth: false,
      error: 'Dialogflow temporarily unavailable'
    });
  }
}