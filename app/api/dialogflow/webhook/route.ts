import { NextRequest, NextResponse } from 'next/server';
import { BankingService } from '@/lib/services/banking-service';

interface DialogflowParameter {
  [key: string]: unknown;
}

interface DialogflowContext {
  name: string;
  lifespanCount?: number;
  parameters?: DialogflowParameter;
}

interface DialogflowRequest {
  responseId: string;
  queryResult: {
    queryText: string;
    intent: {
      name: string;
      displayName: string;
    };
    parameters: DialogflowParameter;
    outputContexts: DialogflowContext[];
  };
  session: string;
}

interface DialogflowMessage {
  platform?: string;
  text?: {
    text: string[];
  };
  quickReplies?: {
    quickReplies: string[];
  };
  payload?: Record<string, unknown>;
}

interface DialogflowResponse {
  fulfillmentText: string;
  fulfillmentMessages?: DialogflowMessage[];
  outputContexts?: Array<{
    name: string;
    lifespanCount: number;
    parameters: DialogflowParameter;
  }>;
}

// Helper to check auth
function isAuthenticated(contexts: DialogflowContext[]): boolean {
  const authContext = contexts.find(ctx => ctx.name.endsWith('/contexts/authenticated'));
  return authContext?.parameters?.authenticated === true;
}

// Helper to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export async function POST(request: NextRequest) {
  try {
    const body: DialogflowRequest = await request.json();
    const { queryResult } = body;
    const intentName = queryResult.intent.displayName;
    const parameters = queryResult.parameters;
    const contexts = queryResult.outputContexts || [];
    
    let response: DialogflowResponse = {
      fulfillmentText: 'I can help with that.'
    };

    const standardQuickReplies = ['Check Balance', 'Transfer Funds', 'Transaction History', 'Talk to Agent'];

    // Common Auth Check Logic
    const checkAuth = () => {
        if (!isAuthenticated(contexts)) {
            return {
                fulfillmentText: 'I need to verify your identity first. Please authenticate to continue.',
                fulfillmentMessages: [{
                    platform: 'PLATFORM_UNSPECIFIED',
                    payload: { action: 'REQUIRE_AUTH', message: 'Please authenticate to proceed' }
                }]
            };
        }
        return null;
    };

    // Helper to maintain the authenticated context if it exists
    const getAuthContext = () => {
        const authContext = contexts.find(ctx => ctx.name.endsWith('/contexts/authenticated'));
        if (authContext) {
            return [{
                name: authContext.name,
                lifespanCount: 20, // Refresh lifespan
                parameters: authContext.parameters || {}
            }];
        }
        return [];
    };

    switch (intentName) {
      case 'Default Welcome Intent':
      case 'Welcome':
        response = {
            fulfillmentText: 'Welcome to SecureBank! I can help you check balances, transfer funds, or view recent transactions.',
            fulfillmentMessages: [
              { text: { text: ['Welcome to SecureBank! I can help you check balances, transfer funds, or view recent transactions.'] } },
              { quickReplies: { quickReplies: standardQuickReplies } }
            ]
        };
        break;

      case 'check.balance': {
        const authError = checkAuth();
        if (authError) {
            response = authError;
        } else {
            // DIRECT SERVICE CALL - No fetch()
            const accounts = await BankingService.getAccounts();
            const checking = accounts.find(a => a.type === 'checking');
            const savings = accounts.find(a => a.type === 'savings');
            
            const text = `Here are your balances:\n\nChecking ${checking?.accountNumber}: ${formatCurrency(checking?.balance || 0)}\nSavings ${savings?.accountNumber}: ${formatCurrency(savings?.balance || 0)}`;
            
            response = {
              fulfillmentText: text,
              fulfillmentMessages: [{ text: { text: [text] } }, { quickReplies: { quickReplies: standardQuickReplies } }],
              outputContexts: getAuthContext()
            };
        }
        break;
      }

      case 'transfer.funds': {
        const transferAuthError = checkAuth();
        if (transferAuthError) {
            response = transferAuthError;
            break;
        }
        
        const amountParam = parameters.amount as { amount?: number } | number | undefined;
        const amount = typeof amountParam === 'object' ? amountParam?.amount : amountParam;
        const fromAccount = parameters.fromAccount as string;
        let toAccount = parameters.toAccount as string; 
        
        if (fromAccount && !toAccount) {
          toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
        }

        if (!amount) {
          response.fulfillmentText = 'How much would you like to transfer?';
        } else if (!fromAccount) {
          response.fulfillmentText = 'Which account are you transferring from, checking or savings?';
        } else if (!toAccount) {
          response.fulfillmentText = `And where are we transferring the ${formatCurrency(Number(amount))} to?`;
        } else {
             const result = await BankingService.processTransfer(
                 fromAccount as 'checking' | 'savings', 
                 toAccount as 'checking' | 'savings', 
                 Number(amount)
             );
             
             if (result.success) {
                 const text = `Transfer complete! Moved ${formatCurrency(Number(amount))} from ${fromAccount} to ${toAccount}.`;
                 response = {
                     fulfillmentText: text,
                     fulfillmentMessages: [{ text: { text: [text] } }, { quickReplies: { quickReplies: standardQuickReplies } }],
                     outputContexts: getAuthContext()
                 };
             } else {
                 response = { 
                     fulfillmentText: `Transfer failed: ${result.error}`,
                     fulfillmentMessages: [
                        { text: { text: [`Transfer failed: ${result.error}`] } },
                        { quickReplies: { quickReplies: ['Try Again', 'Check Balance'] } }
                     ],
                     outputContexts: getAuthContext()
                 };
             }
        }
        break;
      }

      case 'transaction.history': {
        const txnAuthError = checkAuth();
        if (txnAuthError) {
            response = txnAuthError;
        } else {
            // DIRECT SERVICE CALL
            const transactions = await BankingService.getTransactions(undefined, 5);
            
            if (transactions.length === 0) {
                response = { 
                    fulfillmentText: "No recent transactions found.",
                    outputContexts: getAuthContext()
                };
            } else {
                let text = 'Recent transactions:\n\n';
                transactions.forEach((t, i) => {
                    text += `${i+1}. ${t.date} - ${t.description} (${formatCurrency(t.amount)})\n`;
                });
                response = {
                    fulfillmentText: text,
                    fulfillmentMessages: [{ text: { text: [text] } }, { quickReplies: { quickReplies: standardQuickReplies } }],
                    outputContexts: getAuthContext()
                };
            }
        }
        break;
      }

      case 'request.agent':
        response = {
          fulfillmentText: 'I understand you\'d like to speak with an agent. Let me transfer you to the next available representative. Please wait...',
          fulfillmentMessages: [{
            platform: 'PLATFORM_UNSPECIFIED',
            payload: { action: 'TRANSFER_AGENT', message: 'Transferring to live agent...' }
          }]
        };
        break;

      default:
        response = {
            fulfillmentText: 'I can help you check balances, transfer funds, or view recent transactions. What would you like to do?',
            fulfillmentMessages: [
              { text: { text: ['I can help you check balances, transfer funds, or view recent transactions. What would you like to do?'] } },
              { quickReplies: { quickReplies: standardQuickReplies } }
            ]
        };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ 
        fulfillmentText: 'I apologize, but I encountered a system error. Please try again later.' 
    });
  }
}