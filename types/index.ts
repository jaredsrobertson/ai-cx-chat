// types/index.ts

// --- Banking Domain ---
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

export interface TransferResult {
  success: boolean;
  data?: {
    fromAccount: string;
    toAccount: string;
    amount: number;
    newFromBalance: number;
    newToBalance: number;
    transactionId: string;
  };
  error?: string;
}

// --- Chat Domain ---
export type QuickReply = string | { display: string; payload: string };

export interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  quickReplies?: QuickReply[];
  payload?: Record<string, unknown> | null;
  intent?: string;
  nluConfidence?: number;
}

export type BotType = 'dialogflow' | 'lex';