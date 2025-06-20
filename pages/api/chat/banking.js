import jwt from 'jsonwebtoken';
import dialogflowService from '../../../lib/dialogflow';
import { v4 as uuidv4 } from 'uuid';

// Simple rate limiting
const attempts = new Map();

function rateLimit(identifier, maxAttempts = 20, windowMs = 60000) {
  const now = Date.now();
  const userAttempts = attempts.get(identifier) || { count: 0, resetTime: now + windowMs };
  
  if (now > userAttempts.resetTime) {
    userAttempts.count = 0;
    userAttempts.resetTime = now + windowMs;
  }
  
  userAttempts.count++;
  attempts.set(identifier, userAttempts);
  
  return userAttempts.count <= maxAttempts;
}

// Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 1000); // Limit message length
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  // Validate JWT_SECRET if authentication is being used
  if (req.headers.authorization && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    console.error('JWT_SECRET must be set and at least 32 characters long');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  try {
    let { message, sessionId } = req.body;
    
    // Generate session ID if not provided
    if (!sessionId) {
      sessionId = uuidv4();
    }

    // Sanitize and validate message
    message = sanitizeInput(message);
    if (!message) {
      return res.status(400).json({ success: false, error: 'Valid message is required' });
    }

    // Rate limiting by IP
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    if (!rateLimit(clientIP)) {
      return res.status(429).json({ 
        success: false, 
        error: 'Too many requests. Please slow down.' 
      });
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
        // Continue without authentication rather than failing
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
      error: "I'm having trouble connecting to my services right now. Please try again."
    });
  }
}