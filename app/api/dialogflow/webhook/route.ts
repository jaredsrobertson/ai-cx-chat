// app/api/dialogflow/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Account, Transaction } from '@/lib/mock-data';

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

// Helper function to check if user is authenticated
function isAuthenticated(contexts: DialogflowContext[]): boolean {
  const authContext = contexts.find(ctx => ctx.name.endsWith('/contexts/authenticated'));
  return authContext?.parameters?.authenticated === true;
}

// Helper function to format currency
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
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
    const API_TOKEN = process.env.MOCK_API_TOKEN || 'demo-token';

    if (!BASE_URL) {
        console.error("FATAL: NEXT_PUBLIC_BASE_URL environment variable is not set.");
        throw new Error("Application is not configured correctly; missing base URL.");
    }
    
    let response: DialogflowResponse = {
      fulfillmentText: 'I can help with that.'
    };

    const authContext = contexts.find(ctx => ctx.name.endsWith('/contexts/authenticated'));

    const refreshAuthContext = (existingContext?: DialogflowContext) => {
        return existingContext ? [{ 
            name: existingContext.name, 
            lifespanCount: 20, 
            parameters: existingContext.parameters || {}
        }] : [];
    }
    
    const standardQuickReplies = ['Check Balance', 'Transfer Funds', 'Transaction History', 'Talk to Agent'];

    switch (intentName) {
      case 'Default Welcome Intent':
      case 'Welcome':
        {
          const welcomeText = 'Welcome to SecureBank! I can help you check balances, transfer funds, or view recent transactions. How can I assist you today?';
          response = {
            fulfillmentText: welcomeText,
            fulfillmentMessages: [
              { text: { text: [welcomeText] } },
              { quickReplies: { quickReplies: standardQuickReplies } }
            ]
          };
        }
        break;

      case 'check.balance':
        if (!isAuthenticated(contexts)) {
          response = {
            fulfillmentText: 'I need to verify your identity first. Please authenticate to continue.',
            fulfillmentMessages: [{
                platform: 'PLATFORM_UNSPECIFIED',
                payload: { action: 'REQUIRE_AUTH', message: 'Please authenticate to check your balance' }
            }]
          };
        } else {
          const apiResponse = await fetch(`${BASE_URL}/api/banking/accounts`, {
            headers: { 'Authorization': `Bearer ${API_TOKEN}` }
          });

          if (!apiResponse.ok) {
            console.error('API Error (accounts):', apiResponse.status, await apiResponse.text());
            response = { fulfillmentText: "I'm sorry, I couldn't connect to the banking system right now." };
          } else {
            const data = await apiResponse.json();
            const checkingAccount = data.data.accounts.find((a: Account) => a.type === 'checking');
            const savingsAccount = data.data.accounts.find((a: Account) => a.type === 'savings');
            const text = `Here are your account balances:\n\nChecking ${checkingAccount?.accountNumber}: ${formatCurrency(checkingAccount?.balance || 0)}\nSavings ${savingsAccount?.accountNumber}: ${formatCurrency(savingsAccount?.balance || 0)}`;
            response = {
              fulfillmentText: text,
              fulfillmentMessages: [{ text: { text: [text] } }, { quickReplies: { quickReplies: standardQuickReplies } }],
              outputContexts: refreshAuthContext(authContext)
            };
          }
        }
        break;

      case 'transfer.funds': {
        if (!isAuthenticated(contexts)) {
          response = {
            fulfillmentText: 'For your security, I need to verify your identity before we transfer funds. Please authenticate.',
            fulfillmentMessages: [{
              platform: 'PLATFORM_UNSPECIFIED',
              payload: { action: 'REQUIRE_AUTH', message: 'Please authenticate to transfer funds' }
            }]
          };
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
          response.fulfillmentText = `And where are we transferring the ${formatCurrency(amount)} to?`;
        } else {
          const apiResponse = await fetch(`${BASE_URL}/api/banking/transfer`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromAccount: fromAccount as 'checking' | 'savings',
              toAccount: toAccount as 'checking' | 'savings',
              amount: amount
            })
          });
          const result = await apiResponse.json();

          if (apiResponse.ok && result.success) {
            const successText = `Transfer confirmed! I've moved ${formatCurrency(amount)} from your ${fromAccount} to ${toAccount} account.`;
            response = {
              fulfillmentText: `${successText}\n\nNew balances:\n${fromAccount}: ${formatCurrency(result.data?.newFromBalance || 0)}\n${toAccount}: ${formatCurrency(result.data?.newToBalance || 0)}`,
              fulfillmentMessages: [
                { text: { text: [successText] } },
                { quickReplies: { quickReplies: standardQuickReplies } }
              ]
            };
          } else {
            const errorMsg = result.message || 'Transfer failed. Please try again.';
            response = {
              fulfillmentText: `Transfer failed: ${errorMsg}`,
              fulfillmentMessages: [
                { text: { text: [`Transfer failed: ${errorMsg}. Please try again.`]}},
                { quickReplies: { quickReplies: ['Try Again', 'Check Balance', 'Talk to Agent']}}
              ]
            };
          }
        }
        
        response.outputContexts = refreshAuthContext(authContext);
        break;
      }

      case 'transaction.history':
        if (!isAuthenticated(contexts)) {
           response = {
            fulfillmentText: 'I need to verify your identity first. Please authenticate to continue.',
            fulfillmentMessages: [{
              platform: 'PLATFORM_UNSPECIFIED',
              payload: { action: 'REQUIRE_AUTH', message: 'Please authenticate to view transactions' }
            }]
          };
        } else {
            const apiResponse = await fetch(`${BASE_URL}/api/banking/transactions?limit=5`, {
                headers: { 'Authorization': `Bearer ${API_TOKEN}` }
            });
          
            if (!apiResponse.ok) {
                console.error('API Error (transactions):', apiResponse.status, await apiResponse.text());
                response = { fulfillmentText: "I'm sorry, I couldn't retrieve your transactions right now." };
            } else {
                const data = await apiResponse.json();
                const recentTxns: Transaction[] = data.data.transactions || [];
                let transactionText = 'Here are your recent transactions:\n\n';
                if (recentTxns.length === 0) {
                    transactionText = "You have no recent transactions.";
                } else {
                    recentTxns.forEach((txn, index) => {
                        transactionText += `${index + 1}. ${txn.date} - ${txn.description}\n   Amount: ${formatCurrency(txn.amount)} ${txn.type === 'credit' ? '(Credit)' : '(Debit)'}\n\n`;
                    });
                }
                response = {
                    fulfillmentText: transactionText,
                    fulfillmentMessages: [
                        { text: { text: [transactionText] } },
                        { quickReplies: { quickReplies: standardQuickReplies } }
                    ],
                    outputContexts: refreshAuthContext(authContext)
                };
            }
        }
        break;

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
        {
          const defaultText = 'I can help you check balances, transfer funds, or view recent transactions. What would you like to do?';
          response = {
            fulfillmentText: defaultText,
            fulfillmentMessages: [
              { text: { text: [defaultText] } },
              { quickReplies: { quickReplies: standardQuickReplies } }
            ]
          };
        }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Dialogflow webhook error:', error);
    const errorText = 'I apologize, but I encountered an error. Please try again or speak to an agent.';
    return NextResponse.json({
      fulfillmentText: errorText,
      fulfillmentMessages: [
        { text: { text: [errorText] } },
        { quickReplies: { quickReplies: ['Try Again', 'Talk to Agent'] } }
      ]
    });
  }
}