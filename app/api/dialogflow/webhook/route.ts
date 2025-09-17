// app/api/dialogflow/webhook/route.ts
import { Account, Transaction } from '@/lib/mock-data';
import { NextRequest, NextResponse } from 'next/server';


interface DialogflowParameter {
  [key: string]: unknown;
}

interface DialogflowContext {
  name: string;
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

// Helper function to create quick replies
function createQuickReplies(text: string, replies: string[]): DialogflowMessage {
  return {
    platform: 'PLATFORM_UNSPECIFIED',
    text: {
      text: [text]
    },
    quickReplies: {
      quickReplies: replies
    }
  };
}

// Helper function to check if user is authenticated
function isAuthenticated(contexts: DialogflowContext[]): boolean {
  return contexts.some(ctx => 
    ctx.name.endsWith('/contexts/authenticated') && 
    ctx.parameters?.authenticated === true
  );
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
    const { queryResult, session } = body;
    const intentName = queryResult.intent.displayName;
    const parameters = queryResult.parameters;
    const contexts = queryResult.outputContexts || [];
    
    // Define the Base URL to call your own APIs
    const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    
    console.log('Dialogflow webhook received:', intentName, parameters);

    let response: DialogflowResponse = {
      fulfillmentText: 'I can help you with that.'
    };

    switch (intentName) {
      case 'Default Welcome Intent':
      case 'Welcome':
        response = {
          fulfillmentText: 'Welcome to SecureBank! I can help you check balances, transfer funds, or view recent transactions. How can I assist you today?',
          fulfillmentMessages: [
            createQuickReplies(
              'Welcome to SecureBank! I can help you check balances, transfer funds, or view recent transactions. How can I assist you today?',
              ['Check Balance', 'Transfer Funds', 'Transaction History', 'Talk to Agent']
            )
          ]
        };
        break;

      case 'check.balance':
        if (!isAuthenticated(contexts)) {
          response = {
            fulfillmentText: 'I need to verify your identity first. Please authenticate to continue.',
            fulfillmentMessages: [
              {
                platform: 'PLATFORM_UNSPECIFIED',
                payload: {
                  action: 'REQUIRE_AUTH',
                  message: 'Please authenticate to check your balance'
                }
              }
            ],
            outputContexts: [{
              name: `${session}/contexts/awaiting-auth`,
              lifespanCount: 5,
              parameters: {
                pendingIntent: 'check.balance'
              }
            }]
          };
        } else {
          const apiResponse = await fetch(`${BASE_URL}/api/banking/accounts`, {
            headers: { 'Authorization': `Bearer ${process.env.MOCK_API_TOKEN}` }
          });

          if (!apiResponse.ok) {
            response = { fulfillmentText: "I'm sorry, I couldn't connect to the banking system right now." };
          } else {
            const data = await apiResponse.json();
            const checkingAccount = data.data.accounts.find((a: Account) => a.type === 'checking');
            const savingsAccount = data.data.accounts.find((a: Account) => a.type === 'savings');

            const text = `Here are your account balances:\n\n` +
              `Checking ${checkingAccount?.accountNumber}: ${formatCurrency(checkingAccount?.balance || 0)}\n` +
              `Savings ${savingsAccount?.accountNumber}: ${formatCurrency(savingsAccount?.balance || 0)}`;

            response = {
              fulfillmentText: text,
              fulfillmentMessages: [createQuickReplies(text, ['Transfer Funds', 'Transaction History', 'Done'])]
            };
          }
        }
        break;

      case 'transfer.funds':
        if (!isAuthenticated(contexts)) {
          response = {
            fulfillmentText: 'I need to verify your identity first. Please authenticate to continue.',
            fulfillmentMessages: [
              {
                platform: 'PLATFORM_UNSPECIFIED',
                payload: {
                  action: 'REQUIRE_AUTH',
                  message: 'Please authenticate to transfer funds'
                }
              }
            ],
            outputContexts: [{
              name: `${session}/contexts/awaiting-auth`,
              lifespanCount: 5,
              parameters: {
                pendingIntent: 'transfer.funds',
                amount: parameters.amount,
                fromAccount: parameters.fromAccount,
                toAccount: parameters.toAccount
              }
            }]
          };
        } else {
          // Extract parameters with type checking
          const amountParam = parameters.amount as { amount?: number } | number | undefined;
          const amount = typeof amountParam === 'object' ? amountParam?.amount : amountParam;
          let fromAccount = parameters.fromAccount as string;
          let toAccount = parameters.toAccount as string;

          if (fromAccount && !toAccount) {
            toAccount = 'savings'; // Assume 'savings' if only 'from' is given
          } else if (!fromAccount && toAccount) {
            fromAccount = 'checking'; // Assume 'checking' if only 'to' is given
          }

          // Check if we have all required parameters
          if (!amount || !fromAccount || !toAccount) {
            const missingParams: string[] = [];
            if (!amount) missingParams.push('amount');
            if (!fromAccount) missingParams.push('source account');
            if (!toAccount) missingParams.push('destination account');
            
            response = {
              fulfillmentText: `I need some more information. Please provide the ${missingParams.join(' and ')}.`,
              fulfillmentMessages: [
                createQuickReplies(
                  `I need some more information. Please provide the ${missingParams.join(' and ')}.`,
                  ['Cancel']
                )
              ]
            };
          } else {
            const validFromAccount = fromAccount as 'checking' | 'savings';
            const validToAccount = toAccount as 'checking' | 'savings';
            
            const apiResponse = await fetch(`${BASE_URL}/api/banking/transfer`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.MOCK_API_TOKEN}`, // Send the secure token
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                fromAccount: validFromAccount,
                toAccount: validToAccount,
                amount: amount
              })
            });

            const result = await apiResponse.json();

            if (apiResponse.ok && result.success) {
              response = {
                fulfillmentText: `Transfer confirmed! I've moved ${formatCurrency(amount)} from your ${fromAccount} to ${toAccount} account.\n\n` +
                  `New balances:\n` +
                  `${fromAccount}: ${formatCurrency(result.data?.newFromBalance || 0)}\n` +
                  `${toAccount}: ${formatCurrency(result.data?.newToBalance || 0)}`,
                fulfillmentMessages: [
                  createQuickReplies(
                    `Transfer confirmed! I've moved ${formatCurrency(amount)} from your ${fromAccount} to ${toAccount} account.`,
                    ['Check Balance', 'Another Transfer', 'Done']
                  )
                ]
              };
            } else {
              const errorMsg = result.message || 'Transfer failed. Please try again.';
              response = {
                fulfillmentText: `Transfer failed: ${errorMsg}`,
                fulfillmentMessages: [
                  createQuickReplies(
                    `Transfer failed: ${errorMsg}. Please try again.`,
                    ['Try Again', 'Check Balance', 'Talk to Agent']
                  )
                ]
              };
            }
          }
        }
        break;

      case 'transaction.history':
        if (!isAuthenticated(contexts)) {
          response = {
            fulfillmentText: 'I need to verify your identity first. Please authenticate to continue.',
            fulfillmentMessages: [
              {
                platform: 'PLATFORM_UNSPECIFIED',
                payload: {
                  action: 'REQUIRE_AUTH',
                  message: 'Please authenticate to view transactions'
                }
              }
            ],
            outputContexts: [{
              name: `${session}/contexts/awaiting-auth`,
              lifespanCount: 5,
              parameters: {
                pendingIntent: 'transaction.history'
              }
            }]
          };
        } else {
          const apiResponse = await fetch(`${BASE_URL}/api/banking/transactions?limit=5`, {
             headers: { 'Authorization': `Bearer ${process.env.MOCK_API_TOKEN}` }
          });
          
          if (!apiResponse.ok) {
             response = { fulfillmentText: "I'm sorry, I couldn't retrieve your transactions right now." };
          } else {
            const data = await apiResponse.json();
            const recentTxns = data.data.transactions || [];
            
            let transactionText = 'Here are your recent transactions:\n\n';
            
            if (recentTxns.length === 0) {
              transactionText = "You have no recent transactions.";
            } else {
              recentTxns.forEach((txn: Transaction, index: number) => {
                transactionText += `${index + 1}. ${txn.date} - ${txn.description}\n`;
                transactionText += `   Amount: ${formatCurrency(txn.amount)} ${txn.type === 'credit' ? '(Credit)' : '(Debit)'}\n\n`;
              });
            }
            
            response = {
              fulfillmentText: transactionText,
              fulfillmentMessages: [
                createQuickReplies(
                  transactionText,
                  ['Check Balance', 'Transfer Funds', 'Done']
                )
              ]
            };
          }
        }
        break;

      case 'request.agent':
        response = {
          fulfillmentText: 'I understand you\'d like to speak with an agent. Let me transfer you to the next available representative. Please wait...',
          fulfillmentMessages: [
            {
              platform: 'PLATFORM_UNSPECIFIED',
              payload: {
                action: 'TRANSFER_AGENT',
                message: 'Transferring to live agent...'
              }
            }
          ]
        };
        break;

      case 'authenticate.success':
        // This intent is triggered after successful authentication
        response = {
          fulfillmentText: 'Great! You\'re now authenticated. How can I help you?',
          fulfillmentMessages: [
            createQuickReplies(
              'Great! You\'re now authenticated. How can I help you?',
              ['Check Balance', 'Transfer Funds', 'Transaction History']
            )
          ],
          outputContexts: [{
            name: `${session}/contexts/authenticated`,
            lifespanCount: 20, // Keep authenticated for 20 turns
            parameters: {
              authenticated: true
            }
          }]
        };
        break;

      default:
        response = {
          fulfillmentText: 'I can help you check balances, transfer funds, or view recent transactions. What would you like to do?',
          fulfillmentMessages: [
            createQuickReplies(
              'I can help you check balances, transfer funds, or view recent transactions. What would you like to do?',
              ['Check Balance', 'Transfer Funds', 'Transaction History', 'Talk to Agent']
            )
          ]
        };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Dialogflow webhook error:', error);
    return NextResponse.json({
      fulfillmentText: 'I apologize, but I encountered an error. Please try again or speak to an agent.',
      fulfillmentMessages: [
        createQuickReplies(
          'I apologize, but I encountered an error. Please try again or speak to an agent.',
          ['Try Again', 'Talk to Agent']
        )
      ]
    });
  }
}