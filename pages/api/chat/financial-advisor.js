import { OpenAIService } from '../../../lib/openai';

export const config = {
  runtime: 'edge',
};

const openAIService = new OpenAIService();

// Simple rate limiting for edge runtime
const attempts = new Map();

function rateLimit(identifier, maxAttempts = 10, windowMs = 60000) {
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
    .substring(0, 2000); // Limit message length for advisor (longer than banking)
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  
  return messages
    .filter(msg => msg && typeof msg === 'object' && msg.role && msg.content)
    .map(msg => ({
      role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
      content: sanitizeInput(msg.content)
    }))
    .filter(msg => msg.content.length > 0)
    .slice(-20); // Limit conversation history to last 20 messages
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: `Method ${req.method} Not Allowed` }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { messages } = body;

    // Validate and sanitize messages
    const sanitizedMessages = sanitizeMessages(messages);
    
    if (sanitizedMessages.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Valid messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting by IP (basic implementation for edge runtime)
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    if (!rateLimit(clientIP)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Too many requests. Please slow down.' 
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for potentially harmful content
    const lastMessage = sanitizedMessages[sanitizedMessages.length - 1];
    if (lastMessage && lastMessage.content) {
      const suspiciousPatterns = [
        /how to hack/i,
        /illegal/i,
        /scam/i,
        /fraud/i,
        /money laundering/i
      ];
      
      if (suspiciousPatterns.some(pattern => pattern.test(lastMessage.content))) {
        return new Response(JSON.stringify({
          success: false,
          error: 'I can only provide legitimate financial advice.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const stream = await openAIService.getFinancialAdviceStream(sanitizedMessages);
    
    return new Response(stream, {
      headers: { 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });
    
  } catch (error) {
    console.error('Financial advisor stream error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to get response from financial advisor. Please try again.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}