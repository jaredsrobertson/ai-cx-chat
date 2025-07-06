import jwt from 'jsonwebtoken';
import { mockUsers } from '@/lib/mockData';
import { createApiHandler } from '@/lib/apiUtils';
import { logger } from '@/lib/logger';

const getUserByUsername = (username) => {
  const user = mockUsers[username];
  if (user) {
    const { pin, ...userData } = user;
    return userData;
  }
  return null;
};

const verifyHandler = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = getUserByUsername(decoded.username);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, username: decoded.username, accounts: user.accounts }
      }
    });
  } catch (error) {
    logger.error('Token verification error:', error.message);
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

export default createApiHandler(verifyHandler, {
  allowedMethods: ['GET'],
});