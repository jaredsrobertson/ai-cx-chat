import jwt from 'jsonwebtoken';

// --- CORRECTED: Full list of mock users ---
const mockUsers = {
  'demo123': {
    id: 'demo123', pin: '1234', name: 'John Smith', email: 'john.smith@example.com',
    accounts: {
      checking: { balance: 2847.52, recent: [{date: '2024-05-28', description: 'Grocery Store Purchase', amount: -67.43}] },
      savings: { balance: 15420.18, recent: [{date: '2024-05-26', description: 'Transfer from Checking', amount: 500.00}] }
    }
  },
  'sarah456': {
    id: 'sarah456', pin: '9876', name: 'Sarah Johnson', email: 'sarah.johnson@example.com',
    accounts: {
      checking: { balance: 4127.89, recent: [{date: '2024-05-28', description: 'Rent Payment', amount: -1800.00}] },
      savings: { balance: 28750.00, recent: [{date: '2024-05-01', description: 'Monthly Interest', amount: 76.33}] }
    }
  },
  'mike789': {
    id: 'mike789', pin: '5555', name: 'Mike Chen', email: 'mike.chen@example.com',
    accounts: {
      checking: { balance: 12567.34, recent: [{date: '2024-05-28', description: 'Client Payment', amount: 3500.00}] },
      savings: { balance: 45890.22, recent: [{date: '2024-05-01', description: 'Monthly Interest', amount: 68.84}] }
    }
  }
};

const getUserByUsername = (username) => {
  const user = mockUsers[username];
  if (user) {
    const { pin, ...userData } = user;
    return userData;
  }
  return null;
};
// --- End of corrected code ---

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = getUserByUsername(decoded.username);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: decoded.username,
        accounts: user.accounts
      }
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}