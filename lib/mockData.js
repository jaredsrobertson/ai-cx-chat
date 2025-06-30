export const mockUsers = {
  'demo123': {
    id: 'demo123', pin: '1234', name: 'John Smith', email: 'john.smith@example.com',
    accounts: {
      checking: {
        balance: 2847.52,
        recent: [
          { date: '2025-06-20', description: 'Grocery Store Purchase', amount: -67.43 },
          { date: '2025-06-18', description: 'Gas Station', amount: -45.12 },
          { date: '2025-06-17', description: 'Mobile Check Deposit', amount: 850.00 }
        ]
      },
      savings: {
        balance: 15420.18,
        recent: [
          { date: '2025-06-15', description: 'Transfer from Checking', amount: 500.00 },
          { date: '2025-06-01', description: 'Monthly Interest', amount: 12.85 },
          { date: '2025-05-15', description: 'Transfer from Checking', amount: 500.00 }
        ]
      }
    }
  },
  'sarah456': {
    id: 'sarah456', pin: '9876', name: 'Sarah Johnson', email: 'sarah.johnson@example.com',
    accounts: {
      checking: {
        balance: 4127.89,
        recent: [
          { date: '2025-06-20', description: 'Rent Payment', amount: -1800.00 },
          { date: '2025-06-19', description: 'Restaurant', amount: -88.50 },
          { date: '2025-06-18', description: 'Online Shopping', amount: -254.99 }
        ]
      },
      savings: {
        balance: 28750.00,
        recent: [
          { date: '2025-06-01', description: 'Monthly Interest', amount: 76.33 },
          { date: '2025-05-25', description: 'Paycheck Transfer', amount: 1500.00 },
          { date: '2025-05-10', description: 'Paycheck Transfer', amount: 1500.00 }
        ]
      }
    }
  },
  'mike789': {
    id: 'mike789', pin: '5555', name: 'Mike Chen', email: 'mike.chen@example.com',
    accounts: {
      checking: {
        balance: 12567.34,
        recent: [
          { date: '2025-06-19', description: 'Client Payment Received', amount: 3500.00 },
          { date: '2025-06-18', description: 'Office Supplies', amount: -172.40 },
          { date: '2025-06-15', description: 'Software Subscription', amount: -49.99 }
        ]
      },
      savings: {
        balance: 45890.22,
        recent: [
          { date: '2025-06-01', description: 'Monthly Interest', amount: 68.84 },
          { date: '2025-05-20', description: 'Bonus Deposit', amount: 5000.00 },
          { date: '2025-05-01', description: 'Monthly Interest', amount: 62.31 }
        ]
      }
    }
  }
};

export const getUserById = (userId) => {
  const user = mockUsers[userId];
  if (user) {
    const { pin, ...userData } = user;
    return userData;
  }
  return null;
};