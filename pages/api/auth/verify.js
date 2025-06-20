import jwt from 'jsonwebtoken';
import { mockUsers } from '../../../lib/mockData';

const getUserByUsername = (username) => {
  const user = mockUsers[username];
  if (user) {
    const { pin, ...userData } = user;
    return userData;
  }
  return null;
};

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  // Validate JWT_SECRET
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be set and at least 32 characters long');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

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
    console.error('Token verification error:', error.message);
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}