import jwt from 'jsonwebtoken';
import { mockUsers } from '../../../lib/mockData';

const validateUser = (username, pin) => {
  const user = mockUsers[username];
  if (user && user.pin === pin) {
    const { pin: userPin, ...userData } = user;
    return userData;
  }
  return null;
};
// --- End of corrected code ---

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, pin } = req.body;
  if (!username || !pin) {
    return res.status(400).json({ error: 'Username and PIN are required' });
  }

  const user = validateUser(username, pin);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, username: username, name: user.name, accounts: user.accounts },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(200).json({
    success: true,
    token,
    user: { id: user.id, name: user.name, email: user.email, username: username }
  });
}