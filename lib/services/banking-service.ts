import { mockAccounts, mockTransactions, TRANSFER_LIMITS } from '@/lib/mock-data';
import { Account, Transaction, TransferResult } from '@/types';

export const BankingService = {
  getAccounts: async (): Promise<Account[]> => {
    // Simulate DB latency
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockAccounts;
  },

  getAccountByType: async (type: 'checking' | 'savings'): Promise<Account | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockAccounts.find(acc => acc.type === type);
  },

  getTransactions: async (accountId?: string, limit: number = 5): Promise<Transaction[]> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    let transactions = mockTransactions;
    if (accountId) {
      transactions = transactions.filter(txn => txn.accountId === accountId);
    }
    return transactions.slice(0, limit);
  },

  processTransfer: async (fromType: 'checking' | 'savings', toType: 'checking' | 'savings', amount: number): Promise<TransferResult> => {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate processing

    const fromAccount = mockAccounts.find(acc => acc.type === fromType);
    const toAccount = mockAccounts.find(acc => acc.type === toType);
    
    if (!fromAccount || !toAccount) {
      return { success: false, error: 'Invalid account type' };
    }
    
    if (amount < TRANSFER_LIMITS.MIN_AMOUNT || amount > TRANSFER_LIMITS.MAX_AMOUNT) {
      return { success: false, error: `Amount must be between $${TRANSFER_LIMITS.MIN_AMOUNT} and $${TRANSFER_LIMITS.MAX_AMOUNT}` };
    }
    
    if (fromAccount.balance < amount) {
      return { success: false, error: 'Insufficient funds' };
    }
    
    // In a real app, we would perform the DB update here transactionally
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
};