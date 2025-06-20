import jwt from 'jsonwebtoken';
import { mockUsers } from '../../../lib/mockData';

// Simple rate limiting
const attempts = new Map();

function rateLimit(identifier, maxAttempts = 5, windowMs = 60000) {
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
    .trim()
    .substring(0, 100); // Limit length
}

// Restored the original, correct validation logic
const validateUser = (username, pin) => {
  const user = mockUsers[username];
  // Check if user exists and if the pin matches
  if (user && user.pin === pin) {
    const { pin: userPin, ...userData } = user;
    return userData;
  }
  return null;
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  // Validate JWT_SECRET
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be set and at least 32 characters long');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  try {
    let { username, pin } = req.body;

    // Sanitize inputs
    username = sanitizeInput(username);
    pin = sanitizeInput(pin);

    if (!username || !pin) {
      return res.status(400).json({ success: false, error: 'Username and PIN are required' });
    }

    // Rate limiting by IP
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    if (!rateLimit(clientIP)) {
      return res.status(429).json({ 
        success: false, 
        error: 'Too many login attempts. Please try again later.' 
      });
    }

    const user = validateUser(username, pin);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: username, name: user.name, accounts: user.accounts },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return response in our standard shape
    return res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, username: username }
      }
    });

  } catch (error) {
    console.error('Login API error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}