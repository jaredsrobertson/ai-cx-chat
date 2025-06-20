import jwt from 'jsonwebtoken';
import { mockUsers } from '../../../lib/mockData';

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

  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ success: false, error: 'Username and PIN are required' });
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