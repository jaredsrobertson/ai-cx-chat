// app/api/dialogflow/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mockAccounts, mockTransactions, processTransfer } from '@/lib/mock-data';

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
          const checkingAccount = mockAccounts.find(a => a.type === 'checking');
          const savingsAccount = mockAccounts.find(a => a.type === 'savings');
          
          response = {
            fulfillmentText: `Here are your account balances:\n\n` +
              `Checking ${checkingAccount?.accountNumber}: ${formatCurrency(checkingAccount?.balance || 0)}\n` +
              `Savings ${savingsAccount?.accountNumber}: ${formatCurrency(savingsAccount?.balance || 0)}`,
            fulfillmentMessages: [
              createQuickReplies(
                `Here are your account balances:\n\n` +
                `Checking ${checkingAccount?.accountNumber}: ${formatCurrency(checkingAccount?.balance || 0)}\n` +
                `Savings ${savingsAccount?.accountNumber}: ${formatCurrency(savingsAccount?.balance || 0)}`,
                ['Transfer Funds', 'Transaction History', 'Done']
              )
            ]
          };
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
          let amount = typeof amountParam === 'object' ? amountParam?.amount : amountParam;
          let fromAccount = parameters.fromAccount as string;
          let toAccount = parameters.toAccount as string;

          // --- START OF NEW LOGIC ---
          // If only one account is provided, assume the other.
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
            // Process the transfer - ensure account types are valid
            const validFromAccount = fromAccount as 'checking' | 'savings';
            const validToAccount = toAccount as 'checking' | 'savings';
            const result = processTransfer(validFromAccount, validToAccount, amount);
            
            if (result.success) {
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
              response = {
                fulfillmentText: `Transfer failed: ${result.error}. Please try again.`,
                fulfillmentMessages: [
                  createQuickReplies(
                    `Transfer failed: ${result.error}. Please try again.`,
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
          const recentTxns = mockTransactions.slice(0, 5);
          let transactionText = 'Here are your recent transactions:\n\n';
          
          recentTxns.forEach((txn, index) => {
            transactionText += `${index + 1}. ${txn.date} - ${txn.description}\n`;
            transactionText += `   Amount: ${formatCurrency(txn.amount)} ${txn.type === 'credit' ? '(Credit)' : '(Debit)'}\n\n`;
          });
          
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