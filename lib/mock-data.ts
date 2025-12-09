import { Account, Transaction, User } from '@/types';

export const mockUser: User = {
  id: 'user-001',
  name: 'John Demo',
  email: 'demo@bank.com',
  authenticated: false
};

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

export const TRANSFER_LIMITS = {
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 10000,
};