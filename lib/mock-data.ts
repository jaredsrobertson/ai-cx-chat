// lib/mock-data.ts
export interface Account { /* ... */ }
export interface Transaction { /* ... */ }

export interface Account {
  id: string;
  type: 'checking' | 'savings';
  balance: number;
  accountNumber: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category: string;
  accountId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  authenticated: boolean;
}

// Mock user data
export const mockUser: User = {
  id: 'user-001',
  name: 'John Demo',
  email: 'demo@bank.com',
  authenticated: false
};

// Mock accounts
export const mockAccounts: Account[] = [
  {
    id: 'acc-001',
    type: 'checking',
    balance: 5432.10,
    accountNumber: '****4521'
  },
  {
    id: 'acc-002',
    type: 'savings',
    balance: 12543.00,
    accountNumber: '****7892'
  }
];

// Mock recent transactions
export const mockTransactions: Transaction[] = [
  {
    id: 'txn-001',
    date: '2025-01-14',
    description: 'Starbucks Coffee',
    amount: -5.75,
    type: 'debit',
    category: 'Food & Dining',
    accountId: 'acc-001'
  },
  {
    id: 'txn-002',
    date: '2025-01-14',
    description: 'Target Store',
    amount: -87.32,
    type: 'debit',
    category: 'Shopping',
    accountId: 'acc-001'
  },
  {
    id: 'txn-003',
    date: '2025-01-13',
    description: 'Direct Deposit - Employer',
    amount: 2847.50,
    type: 'credit',
    category: 'Income',
    accountId: 'acc-001'
  },
  {
    id: 'txn-004',
    date: '2025-01-12',
    description: 'Netflix Subscription',
    amount: -15.99,
    type: 'debit',
    category: 'Entertainment',
    accountId: 'acc-001'
  },
  {
    id: 'txn-005',
    date: '2025-01-11',
    description: 'Transfer from Savings',
    amount: 500.00,
    type: 'credit',
    category: 'Transfer',
    accountId: 'acc-001'
  }
];

// Transfer validation
export const transferLimits = {
  minAmount: 1,
  maxAmount: 10000,
  dailyLimit: 25000
};

// Mock authentication (for demo purposes)
export const mockCredentials = {
  username: 'demo@bank.com',
  password: 'demo123'
};

// Helper functions
export function getAccountByType(type: 'checking' | 'savings'): Account | undefined {
  return mockAccounts.find(acc => acc.type === type);
}

export function processTransfer(fromType: 'checking' | 'savings', toType: 'checking' | 'savings', amount: number) {
  const fromAccount = getAccountByType(fromType);
  const toAccount = getAccountByType(toType);
  
  if (!fromAccount || !toAccount) {
    return { success: false, error: 'Invalid account type' };
  }
  
  if (amount < transferLimits.minAmount || amount > transferLimits.maxAmount) {
    return { success: false, error: `Amount must be between $${transferLimits.minAmount} and $${transferLimits.maxAmount}` };
  }
  
  if (fromAccount.balance < amount) {
    return { success: false, error: 'Insufficient funds' };
  }
  
  // In a real app, we'd update the database here
  // For demo, we'll just return success
  return {
    success: true,
    data: {
      fromAccount: fromAccount.type,
      toAccount: toAccount.type,
      amount: amount,
      newFromBalance: fromAccount.balance - amount,
      newToBalance: toAccount.balance + amount,
      transactionId: `txn-${Date.now()}`
    }
  };
}