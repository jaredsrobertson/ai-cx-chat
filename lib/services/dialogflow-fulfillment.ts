import { BankingService } from '@/lib/services/banking-service';

interface DialogflowContext {
  name: string;
  lifespanCount?: number;
  parameters?: Record<string, any>;
}

// Helper to check auth from Dialogflow contexts
// NOTE: Auth context is injected by dialogflow-service.ts based on session state
// If user authenticates mid-conversation, the retry will include auth context
function isAuthenticated(contexts: DialogflowContext[]): boolean {
  const authContext = contexts.find(ctx => ctx.name.endsWith('/contexts/authenticated'));
  return authContext?.parameters?.authenticated === true;
}

// Helper to maintain auth context across responses
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

// Helper to clear contexts when a conversation flow completes
// Only used for: flow completion, fallback (safety net), and flow transitions
function clearAllContexts(contexts: DialogflowContext[]): DialogflowContext[] {
  const authContexts = getAuthContext(contexts);
  
  const contextsToClear = contexts
    .filter(ctx => !ctx.name.endsWith('/contexts/authenticated'))
    .map(ctx => ({
      name: ctx.name,
      lifespanCount: 0
    }));

  console.log('Clearing contexts:', contextsToClear.map(c => c.name));
  
  return [...authContexts, ...contextsToClear];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// Normalize account type from various Dialogflow formats
function normalizeAccount(account: any): 'checking' | 'savings' | null {
  if (!account) return null;
  
  // Handle string
  if (typeof account === 'string') {
    const normalized = account.toLowerCase().trim();
    if (normalized.includes('check')) return 'checking';
    if (normalized.includes('sav')) return 'savings';
  }
  
  // Handle Dialogflow entity object with stringValue
  if (typeof account === 'object' && account.stringValue) {
    const normalized = account.stringValue.toLowerCase().trim();
    if (normalized.includes('check')) return 'checking';
    if (normalized.includes('sav')) return 'savings';
  }
  
  return null;
}

// Extract and validate amount from various Dialogflow formats
function extractAmount(amountParam: any): number | null {
  if (!amountParam) return null;
  
  // Handle number directly
  if (typeof amountParam === 'number') {
    return amountParam > 0 ? amountParam : null;
  }
  
  // Handle string - remove currency symbols and parse
  if (typeof amountParam === 'string') {
    const cleaned = amountParam.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return (isNaN(parsed) || parsed <= 0) ? null : parsed;
  }
  
  // Handle Dialogflow @sys.number object
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
      'Check Balance',
      'Transfer Funds', 
      'Transaction History',
      'Talk to Agent',
      'Hours', 
      'Locations',
      'Routing number',
      'Contact info'
    ];
    
    try {
      // Auth Guard
      const protectedIntents = ['check.balance', 'transfer.funds', 'transaction.history'];
      if (protectedIntents.includes(intentName) && !isAuthenticated(contexts)) {
        // IMPORTANT: Don't clear contexts here - preserve them for resume after auth
        // When user returns authenticated, they should be able to continue where they left off
        return {
          fulfillmentText: 'I need to verify your identity first. Please authenticate to continue.',
          fulfillmentMessages: [{
            platform: 'PLATFORM_UNSPECIFIED',
            payload: { action: 'REQUIRE_AUTH', message: 'Please authenticate to proceed' }
          }]
          // NO outputContexts - preserve existing contexts for auth resume
        };
      }

      // Intent Handling
      switch (intentName) {
        case 'Default Welcome Intent':
        case 'Welcome':
          return {
            fulfillmentText: 'Welcome to SecureBank! I can help you check balances, transfer funds, or view recent transactions.',
            fulfillmentMessages: [
              { text: { text: ['Welcome to SecureBank! I can help you check balances, transfer funds, or view recent transactions.'] } },
              { quickReplies: { quickReplies: standardQuickReplies } }
            ],
            // Clear contexts on welcome for clean slate
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
            // Clear contexts - balance check is a complete, single-turn interaction
            outputContexts: clearAllContexts(contexts)
          };
        }

        case 'transfer.funds': {
          // Extract and normalize parameters
          const amount = extractAmount(parameters.amount);
          let fromAccount = normalizeAccount(parameters.fromAccount);
          let toAccount = normalizeAccount(parameters.toAccount);
          
          console.log('Transfer parameters extracted:', { 
            rawAmount: parameters.amount,
            amount, 
            rawFrom: parameters.fromAccount,
            fromAccount, 
            rawTo: parameters.toAccount,
            toAccount 
          });
          
          // Business logic: Infer missing account in two-account system
          if (!fromAccount && toAccount) {
            fromAccount = toAccount === 'checking' ? 'savings' : 'checking';
            console.log('Inferred fromAccount:', fromAccount);
          } else if (fromAccount && !toAccount) {
            toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
            console.log('Inferred toAccount:', toAccount);
          }

          // VALIDATION: Check if we have all required parameters
          if (!amount || !fromAccount || !toAccount) {
            console.log('Missing parameters:', { amount, fromAccount, toAccount });
            
            // PROPER MULTI-TURN: Don't clear contexts - allow user to provide missing info
            // User can say "transfer" → "to savings" → "$100" across multiple turns
            return { 
              fulfillmentText: 'I need a bit more info. Please specify the amount and the account.',
              fulfillmentMessages: [
                { text: { text: ['I need a bit more info. Please specify the amount and the account.'] } },
                { quickReplies: { quickReplies: ['$50', '$100', '$500', 'To Savings', 'To Checking'] } }
              ]
              // NO outputContexts - keeps transfer context active for next turn
            };
          }

          // VALIDATION: Check for same account transfer
          if (fromAccount === toAccount) {
            console.log('Same account transfer attempted:', fromAccount);
            return {
              fulfillmentText: 'You cannot transfer to the same account. Please specify different accounts.',
              fulfillmentMessages: [
                { text: { text: ['You cannot transfer to the same account. Please specify different accounts.'] } },
                { quickReplies: { quickReplies: ['To Savings', 'To Checking', 'Check Balance'] } }
              ],
              // Clear contexts - this is an error, reset the flow
              outputContexts: clearAllContexts(contexts)
            };
          }

          // All parameters present and valid - process transfer
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
              // Clear contexts - transfer flow is complete
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
              // Clear contexts - transfer flow ended (even if failed)
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
              // Clear contexts - single-turn interaction complete
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
            // Clear contexts - single-turn interaction complete
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
            // Clear contexts when handing off to agent
            outputContexts: clearAllContexts(contexts)
          };

        case 'Default Fallback Intent':
          // SAFETY NET: Always clear contexts on fallback to prevent stuck states
          console.log('Fallback triggered - clearing all contexts');
          return {
            fulfillmentText: 'I missed that. I can help with account balances, transfers, or transaction history.',
            fulfillmentMessages: [
              { text: { text: ['I missed that. I can help with account balances, transfers, or transaction history.'] } },
              { quickReplies: { quickReplies: standardQuickReplies } }
            ],
            // CRITICAL: Always clear on fallback (safety net for conversation state)
            outputContexts: clearAllContexts(contexts)
          };

        default:
          // Knowledge Base queries, FAQ intents, etc.
          // These are stateless - no context management needed
          console.log('Stateless intent (KB/FAQ):', intentName);
          return {
            fulfillmentText: 'I can help you check balances, transfer funds, or view recent transactions.',
            fulfillmentMessages: [
              { text: { text: ['I can help you check balances, transfer funds, or view recent transactions.'] } },
              { quickReplies: { quickReplies: standardQuickReplies } }
            ]
            // NO outputContexts - stateless intents don't need context management
          };
      }
      
    } catch (error) {
      console.error('DialogflowFulfillment Error:', error);
      
      // Return user-friendly error message
      return {
        fulfillmentText: 'I apologize, but I encountered an error processing your request. Please try again.',
        fulfillmentMessages: [
          { text: { text: ['I apologize, but I encountered an error processing your request. Please try again.'] } },
          { quickReplies: { quickReplies: standardQuickReplies } }
        ],
        // Clear contexts on error to reset to clean state
        outputContexts: clearAllContexts(contexts)
      };
    }
  }
};