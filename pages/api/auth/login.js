import jwt from 'jsonwebtoken';
import { mockUsers } from '@/lib/mockData';
import { createApiHandler } from '@/lib/apiUtils';
import { sanitizeCredentials } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

const validateUser = (username, pin) => {
  const user = mockUsers[username];
  if (user && user.pin === pin) {
    const { pin: userPin, ...userData } = user;
    return userData;
  }
  return null;
};

const loginHandler = async (req, res) => {
  const { username: rawUsername, pin: rawPin } = req.body;

  const { username, pin } = sanitizeCredentials(rawUsername, rawPin);

  if (!username || !pin) {
    return res.status(400).json({
      success: false,
      error: 'Username and PIN are required'
    });
  }

  const user = validateUser(username, pin);

  if (!user) {
    logger.warn('Invalid login attempt', { username });
    return res.status(401).json({
      success: false,
      error: CONFIG.MESSAGES.ERRORS.INVALID_CREDENTIALS
    });
  }

  const token = jwt.sign(
    {
      userId: user.id,
      username: username,
      name: user.name,
      accounts: user.accounts
    },
    process.env.JWT_SECRET,
    { expiresIn: CONFIG.JWT.EXPIRES_IN }
  );

  logger.info('Login successful', { username });

  return res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: username
      }
    }
  });
};

export default createApiHandler(loginHandler, {
  allowedMethods: ['POST'],
  rateLimit: () => ({ max: CONFIG.MAX_REQUESTS_PER_MINUTE.LOGIN, window: 60000 })
});