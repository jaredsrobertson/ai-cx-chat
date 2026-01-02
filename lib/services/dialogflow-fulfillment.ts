import { BankingService } from '@/lib/services/banking-service';

interface DialogflowContext {
  name: string;
  lifespanCount?: number;
  parameters?: Record<string, any>;
}

function isAuthenticated(contexts: DialogflowContext[]): boolean {
  const authContext = contexts.find(ctx => ctx.name.endsWith('/contexts/authenticated'));
  return authContext?.parameters?.authenticated === true;
}

function getAuthContext(contexts: DialogflowContext[]): DialogflowContext[] {
  const authContext = contexts.find(ctx => ctx.name.endsWith('/contexts/authenticated'));
  if (authContext) {
    return [{
      name: authContext.name,
      lifespanCount: 5,
      parameters: authContext.parameters || {}
    }];
  }
  return [];
}

function clearAllContexts(contexts: DialogflowContext[]): DialogflowContext[] {
  const authContexts = getAuthContext(contexts);
  const contextsToClear = contexts
    .filter(ctx => !ctx.name.endsWith('/contexts/authenticated'))
    .map(ctx => ({ name: ctx.name, lifespanCount: 0 }));
  console.log('Clearing contexts:', contextsToClear.map(c => c.name));
  return [...authContexts, ...contextsToClear];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function normalizeAccount(account: any): 'checking' | 'savings' | null {
  if (!account) return null;
  if (typeof account === 'string') {
    const normalized = account.toLowerCase().trim();
    if (normalized.includes('check')) return 'checking';
    if (normalized.includes('sav')) return 'savings';
  }
  if (typeof account === 'object' && account.stringValue) {
    const normalized = account.stringValue.toLowerCase().trim();
    if (normalized.includes('check')) return 'checking';
    if (normalized.includes('sav')) return 'savings';
  }
  return null;
}

function extractAmount(amountParam: any): number | null {
  if (!amountParam) return null;
  if (typeof amountParam === 'number') {
    return amountParam > 0 ? amountParam : null;
  }
  if (typeof amountParam === 'string') {
    const cleaned = amountParam.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return (isNaN(parsed) || parsed <= 0) ? null : parsed;
  }
  if (typeof amountParam === 'object' && amountParam.amount) {
    return extractAmount(amountParam.amount);
  }
  return null;
}

export const DialogflowFulfillment = {
  handleIntent: async (intentName: string, parameters: Record<string, any>, contexts: DialogflowContext[]) => {
    console.log('Intent received:', intentName);
    console.log('Parameters:', parameters);
    console.log('Active contexts:', contexts.map(c => ({ name: c.name, lifespan: c.lifespanCount })));
    
    const standardQuickReplies = [
      'Check Balance', 'Transfer Funds', 'Transaction History',
      'Talk to Agent', 'Hours', 'Locations', 'Routing number', 'Contact info'
    ];
    
    try {
      const protectedIntents = ['check.balance', 'transfer.funds', 'transaction.history'];
      if (protectedIntents.includes(intentName) && !isAuthenticated(contexts)) {
        console.log('Auth required - preserving contexts for resume after auth');
        return {
          fulfillmentText: 'I need to verify your identity first. Please authenticate to continue.',
          fulfillmentMessages: [{
            platform: 'PLATFORM_UNSPECIFIED',
            payload: { action: 'REQUIRE_AUTH', message: 'Please authenticate to proceed' }
          }]
        };
      }

      switch (intentName) {
        case 'Default Welcome Intent':
        case 'Welcome':
          return {
            fulfillmentText: 'Welcome to SecureBank! I can help you check balances, transfer funds, or view recent transactions.',
            fulfillmentMessages: [
              { text: { text: ['Welcome to SecureBank! I can help you check balances, transfer funds, or view recent transactions.'] } },
              { quickReplies: { quickReplies: standardQuickReplies } }
            ],
            outputContexts: clearAllContexts(contexts)
          };

        case 'check.balance': {
          const accounts = await BankingService.getAccounts();
          const checking = accounts.find(a => a.type === 'checking');
          const savings = accounts.find(a => a.type === 'savings');
          const text = `Here are your balances:\n\nChecking ${checking?.accountNumber}: ${formatCurrency(checking?.balance || 0)}\nSavings ${savings?.accountNumber}: ${formatCurrency(savings?.balance || 0)}`;
          return {
            fulfillmentText: text,
            fulfillmentMessages: [
              { text: { text: [text] } }, 
              { quickReplies: { quickReplies: standardQuickReplies } }
            ],
            outputContexts: clearAllContexts(contexts)
          };
        }

        case 'transfer.funds': {
          const amount = extractAmount(parameters.amount);
          let fromAccount = normalizeAccount(parameters.fromAccount);
          let toAccount = normalizeAccount(parameters.toAccount);
          
          console.log('Transfer parameters extracted:', { 
            rawAmount: parameters.amount, amount, 
            rawFrom: parameters.fromAccount, fromAccount, 
            rawTo: parameters.toAccount, toAccount 
          });
          
          if (!fromAccount && toAccount) {
            fromAccount = toAccount === 'checking' ? 'savings' : 'checking';
            console.log('Inferred fromAccount:', fromAccount);
          } else if (fromAccount && !toAccount) {
            toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
            console.log('Inferred toAccount:', toAccount);
          }

          if (!amount || !fromAccount || !toAccount) {
            console.log('Missing parameters after inference:', { amount, fromAccount, toAccount });
            return { 
              fulfillmentText: 'I need a bit more info. Please specify the amount and the account.',
              fulfillmentMessages: [
                { text: { text: ['I need a bit more info. Please specify the amount and the account.'] } },
                { quickReplies: { quickReplies: ['$50', '$100', '$500', 'To Savings', 'To Checking'] } }
              ]
            };
          }

          if (fromAccount === toAccount) {
            console.log('Same account transfer attempted:', fromAccount);
            return {
              fulfillmentText: 'You cannot transfer to the same account. Please specify different accounts.',
              fulfillmentMessages: [
                { text: { text: ['You cannot transfer to the same account. Please specify different accounts.'] } },
                { quickReplies: { quickReplies: ['To Savings', 'To Checking', 'Check Balance'] } }
              ],
              outputContexts: clearAllContexts(contexts)
            };
          }

          const result = await BankingService.processTransfer(fromAccount, toAccount, amount);
          
          if (result.success) {
            const text = `Transfer complete! Moved ${formatCurrency(amount)} from ${fromAccount} to ${toAccount}.`;
            console.log('Transfer successful:', { fromAccount, toAccount, amount });
            return {
              fulfillmentText: text,
              fulfillmentMessages: [
                { text: { text: [text] } }, 
                { quickReplies: { quickReplies: standardQuickReplies } }
              ],
              outputContexts: clearAllContexts(contexts)
            };
          } else {
            console.log('Transfer failed:', result.error);
            return { 
              fulfillmentText: `Transfer failed: ${result.error}`,
              fulfillmentMessages: [
                { text: { text: [`Transfer failed: ${result.error}`] } },
                { quickReplies: { quickReplies: ['Check Balance', 'Try Again'] } }
              ],
              outputContexts: clearAllContexts(contexts)
            };
          }
        }

        case 'transaction.history': {
          const transactions = await BankingService.getTransactions(undefined, 5);
          if (transactions.length === 0) {
            return { 
              fulfillmentText: "No recent transactions found.",
              fulfillmentMessages: [
                { text: { text: ["No recent transactions found."] } },
                { quickReplies: { quickReplies: standardQuickReplies } }
              ],
              outputContexts: clearAllContexts(contexts)
            };
          }
          let text = 'Recent transactions:\n\n';
          transactions.forEach((t, i) => {
            text += `${i+1}. ${t.date} - ${t.description} (${formatCurrency(t.amount)})\n`;
          });
          return {
            fulfillmentText: text,
            fulfillmentMessages: [
              { text: { text: [text] } }, 
              { quickReplies: { quickReplies: standardQuickReplies } }
            ],
            outputContexts: clearAllContexts(contexts)
          };
        }

        case 'request.agent':
          return {
            fulfillmentText: 'Connecting you to a live agent now...',
            fulfillmentMessages: [{
              platform: 'PLATFORM_UNSPECIFIED',
              payload: { action: 'TRANSFER_AGENT', message: 'Connecting...' }
            }],
            outputContexts: clearAllContexts(contexts)
          };

        case 'Default Fallback Intent':
          console.log('Fallback triggered - clearing all contexts');
          return {
            fulfillmentText: 'I missed that. I can help with account balances, transfers, or transaction history.',
            fulfillmentMessages: [
              { text: { text: ['I missed that. I can help with account balances, transfers, or transaction history.'] } },
              { quickReplies: { quickReplies: standardQuickReplies } }
            ],
            outputContexts: clearAllContexts(contexts)
          };

        default:
          console.log('Stateless intent (KB/FAQ):', intentName);
          return {
            fulfillmentText: 'I can help you check balances, transfer funds, or view recent transactions.',
            fulfillmentMessages: [
              { text: { text: ['I can help you check balances, transfer funds, or view recent transactions.'] } },
              { quickReplies: { quickReplies: standardQuickReplies } }
            ]
          };
      }
      
    } catch (error) {
      console.error('DialogflowFulfillment Error:', error);
      return {
        fulfillmentText: 'I apologize, but I encountered an error processing your request. Please try again.',
        fulfillmentMessages: [
          { text: { text: ['I apologize, but I encountered an error processing your request. Please try again.'] } },
          { quickReplies: { quickReplies: standardQuickReplies } }
        ],
        outputContexts: clearAllContexts(contexts)
      };
    }
  }
};