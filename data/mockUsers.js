export const mockUsers = {
  'demo123': {
    id: 'demo123',
    pin: '1234',
    name: 'John Smith',
    email: 'john.smith@email.com',
    accounts: {
      checking: {
        id: 'CHK001',
        type: 'Checking',
        balance: 2847.52,
        accountNumber: '****1234',
        recent: [
          { id: 1, date: '2024-05-28', description: 'Grocery Store Purchase', amount: -67.43, type: 'debit' },
          { id: 2, date: '2024-05-27', description: 'Direct Deposit - Salary', amount: 2500.00, type: 'credit' },
          { id: 3, date: '2024-05-26', description: 'Online Transfer to Savings', amount: -500.00, type: 'transfer' },
          { id: 4, date: '2024-05-25', description: 'Gas Station', amount: -45.20, type: 'debit' },
          { id: 5, date: '2024-05-24', description: 'Coffee Shop', amount: -8.75, type: 'debit' }
        ]
      },
      savings: {
        id: 'SAV001',
        type: 'Savings',
        balance: 15420.18,
        accountNumber: '****5678',
        interestRate: 2.5,
        recent: [
          { id: 1, date: '2024-05-26', description: 'Transfer from Checking', amount: 500.00, type: 'transfer' },
          { id: 2, date: '2024-05-01', description: 'Monthly Interest', amount: 32.13, type: 'interest' },
          { id: 3, date: '2024-04-15', description: 'Direct Deposit', amount: 1000.00, type: 'credit' }
        ]
      }
    },
    creditCards: [
      {
        id: 'CC001',
        type: 'SecureBank Rewards Card',
        balance: 1243.67,
        limit: 5000.00,
        accountNumber: '****9876',
        dueDate: '2024-06-15',
        minPayment: 45.00
      }
    ]
  },
  'sarah456': {
    id: 'sarah456',
    pin: '9876',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    accounts: {
      checking: {
        id: 'CHK002',
        type: 'Checking',
        balance: 4127.89,
        accountNumber: '****2468',
        recent: [
          { id: 1, date: '2024-05-28', description: 'Rent Payment', amount: -1800.00, type: 'debit' },
          { id: 2, date: '2024-05-27', description: 'Freelance Payment', amount: 1500.00, type: 'credit' },
          { id: 3, date: '2024-05-26', description: 'Utilities', amount: -185.43, type: 'debit' }
        ]
      },
      savings: {
        id: 'SAV002',
        type: 'High-Yield Savings',
        balance: 28750.00,
        accountNumber: '****1357',
        interestRate: 3.2,
        recent: [
          { id: 1, date: '2024-05-01', description: 'Monthly Interest', amount: 76.33, type: 'interest' },
          { id: 2, date: '2024-04-20', description: 'Investment Transfer', amount: 2000.00, type: 'credit' }
        ]
      }
    },
    creditCards: [
      {
        id: 'CC002',
        type: 'SecureBank Premium Card',
        balance: 892.15,
        limit: 10000.00,
        accountNumber: '****3690',
        dueDate: '2024-06-20',
        minPayment: 25.00
      }
    ]
  },
  'mike789': {
    id: 'mike789',
    pin: '5555',
    name: 'Mike Chen',
    email: 'mike.chen@email.com',
    accounts: {
      checking: {
        id: 'CHK003',
        type: 'Business Checking',
        balance: 12567.34,
        accountNumber: '****7890',
        recent: [
          { id: 1, date: '2024-05-28', description: 'Client Payment', amount: 3500.00, type: 'credit' },
          { id: 2, date: '2024-05-27', description: 'Office Supplies', amount: -247.88, type: 'debit' },
          { id: 3, date: '2024-05-26', description: 'Software Subscription', amount: -99.00, type: 'debit' }
        ]
      },
      savings: {
        id: 'SAV003',
        type: 'Business Savings',
        balance: 45890.22,
        accountNumber: '****4321',
        interestRate: 1.8,
        recent: [
          { id: 1, date: '2024-05-01', description: 'Monthly Interest', amount: 68.84, type: 'interest' },
          { id: 2, date: '2024-04-25', description: 'Tax Reserve Transfer', amount: 5000.00, type: 'credit' }
        ]
      }
    },
    creditCards: [
      {
        id: 'CC003',
        type: 'SecureBank Business Card',
        balance: 3456.78,
        limit: 25000.00,
        accountNumber: '****1122',
        dueDate: '2024-06-10',
        minPayment: 125.00
      }
    ]
  }
};

export const validateUser = (username, pin) => {
  const user = mockUsers[username];
  if (user && user.pin === pin) {
    // Return user data without sensitive info
    const { pin: userPin, ...userData } = user;
    return userData;
  }
  return null;
};

export const getUserByUsername = (username) => {
  const user = mockUsers[username];
  if (user) {
    const { pin, ...userData } = user;
    return userData;
  }
  return null;
};