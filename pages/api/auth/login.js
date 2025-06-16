import jwt from 'jsonwebtoken';

// --- User data moved from data/mockUsers.js ---
const mockUsers = [
  {
    id: 1,
    name: 'Jared Robertson',
    email: 'jared@example.com',
    username: 'jared',
    pin: '1234', // In a real app, this would be a hashed password
    accounts: {
      checking: { balance: 5420.55, recent: [ { date: '2024-06-15', description: 'Coffee Shop', amount: -4.75 }, { date: '2024-06-14', description: 'Grocery Store', amount: -78.21 }, { date: '2024-06-12', description: 'Gas Station', amount: -45.50 } ] },
      savings: { balance: 12850.22, recent: [ { date: '2024-06-10', description: 'Deposit', amount: 500.00 } ] },
      credit: { balance: -850.00, recent: [] },
    }
  },
];

const validateUser = (username, pin) => {
  return mockUsers.find(user => user.username === username && user.pin === pin);
};
// --- End of moved code ---

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
    { userId: user.id, username: user.username, name: user.name, email: user.email, accounts: user.accounts },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(200).json({
    success: true,
    token,
    user: { id: user.id, name: user.name, email: user.email, username: user.username }
  });
}