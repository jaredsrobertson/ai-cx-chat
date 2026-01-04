import { BankingService } from '@/lib/services/banking-service';

interface DialogflowContext {
  name: string;
  lifespanCount?: number;
  parameters?: Record<string, any>;
}

// Standard Quick Replies for all responses (testing mode)
// Custom format for frontend consumption
const STANDARD_QRB_CUSTOM = [
  { display: '🕒 Hours', payload: 'What are your hours?' },
  { display: '📍 Locations', payload: 'Where are you located?' },
  { display: '🔢 Routing Number', payload: 'What is your routing number?' },
  { display: '💬 Contact Support', payload: 'How do I contact support?' },
  { display: '💰 Check Balance', payload: 'Check my balance' },
  { display: '💸 Transfer Funds', payload: 'Transfer funds' },
  { display: '📋 Transaction History', payload: 'Show my transaction history' },
  { display: '👤 Talk to Agent', payload: 'Talk to agent' }
];

// Simple string format for Dialogflow webhook responses
const STANDARD_QRB_SIMPLE = [
  '🕒 Hours',
  '📍 Locations', 
  '🔢 Routing Number',
  '💬 Contact Support',
  '💰 Check Balance',
  '💸 Transfer Funds',
  '📋 Transaction History',
  '👤 Talk to Agent'
];

// KB intents that don't require auth
const KB_INTENTS = [
  'hours.inquiry',
  'location.inquiry', 
  'routing.inquiry',
  'support.contact',
  'Default Welcome Intent',
  'Welcome'
];

// Protected intents requiring auth
const PROTECTED_INTENTS = [
  'check.balance',
  'transfer.funds',
  'transaction.history',
  'request.agent'
];

function isAuthenticated(contexts: DialogflowContext[], parameters?: Record<string, any>): boolean {
  // Check parameter first (more reliable - comes from queryParams.payload)
  if (parameters?.isAuthenticated === true) {
    return true;
  }
  
  // Fallback to context check for backward compatibility
  const authContext = contexts.find(ctx => ctx.name.endsWith('/contexts/authenticated'));
  return authContext?.parameters?.authenticated === true;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(amount);
}

function normalizeAccount(account: any): 'checking' | 'savings' | null {
  if (!account) return null;
  const str = typeof account === 'string' ? account : account.stringValue;
  if (!str) return null;
  const normalized = str.toLowerCase().trim();
  if (normalized.includes('check')) return 'checking';
  if (normalized.includes('sav')) return 'savings';
  return null;
}

function extractAmount(amountParam: any): number | null {
  if (!amountParam) return null;
  if (typeof amountParam === 'number') return amountParam > 0 ? amountParam : null;
  if (typeof amountParam === 'string') {
    const cleaned = amountParam.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return (isNaN(parsed) || parsed <= 0) ? null : parsed;
  }
  if (amountParam.amount) return extractAmount(amountParam.amount);
  return null;
}

export const DialogflowFulfillment = {
  handleIntent: async (
    intentName: string, 
    parameters: Record<string, any>, 
    contexts: DialogflowContext[]
  ) => {
    console.log('Processing intent:', intentName);
    
    try {
      // AUTH CHECK - Protected intents require authentication
      if (PROTECTED_INTENTS.includes(intentName) && !isAuthenticated(contexts, parameters)) {
        console.log('Auth required for:', intentName);
        return {
          fulfillmentText: 'Please authenticate to continue.',
          fulfillmentMessages: [{
            platform: 'PLATFORM_UNSPECIFIED',
            payload: { 
              action: 'REQUIRE_AUTH', 
              message: 'Authentication required for this action' 
            }
          }]
        };
      }

      // INTENT ROUTING
      switch (intentName) {
        
        // === WELCOME ===
        case 'Default Welcome Intent':
        case 'Welcome':
          return {
            fulfillmentMessages: [
              { text: { text: ['Welcome to SecureBank! I can help with hours, locations, account balances, transfers, and more. What can I help you with?'] } },
              { quickReplies: { quickReplies: STANDARD_QRB_SIMPLE } }
            ]
          };

        // === BALANCE CHECK ===
        case 'check.balance': {
          const accounts = await BankingService.getAccounts();
          const checking = accounts.find(a => a.type === 'checking');
          const savings = accounts.find(a => a.type === 'savings');
          const text = `Your balances:\n\nChecking ${checking?.accountNumber}: ${formatCurrency(checking?.balance || 0)}\nSavings ${savings?.accountNumber}: ${formatCurrency(savings?.balance || 0)}`;
          
          return {
            fulfillmentMessages: [
              { text: { text: [text] } },
              { quickReplies: { quickReplies: STANDARD_QRB_SIMPLE } }
            ]
          };
        }

        // === FUND TRANSFER ===
        case 'transfer.funds': {
          const amount = extractAmount(parameters.amount);
          let fromAccount = normalizeAccount(parameters.fromAccount);
          let toAccount = normalizeAccount(parameters.toAccount);
          
          // Auto-infer missing account
          if (!fromAccount && toAccount) {
            fromAccount = toAccount === 'checking' ? 'savings' : 'checking';
          } else if (fromAccount && !toAccount) {
            toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
          }

          // Validate we have all info
          if (!amount || !fromAccount || !toAccount) {
            return {
              fulfillmentMessages: [
                { text: { text: ['Please specify the amount and which account to transfer to.'] } },
                { quickReplies: { quickReplies: ['$50', '$100', '$500', 'To Savings', 'To Checking'] } }
              ]
            };
          }

          // Same account check
          if (fromAccount === toAccount) {
            return {
              fulfillmentMessages: [
                { text: { text: ['Cannot transfer to the same account. Please try again.'] } },
                { quickReplies: { quickReplies: STANDARD_QRB_SIMPLE } }
              ]
            };
          }

          // Execute transfer
          const result = await BankingService.processTransfer(fromAccount, toAccount, amount);
          
          if (result.success) {
            const text = `✓ Transfer complete! Moved ${formatCurrency(amount)} from ${fromAccount} to ${toAccount}.`;
            return {
              fulfillmentMessages: [
                { text: { text: [text] } },
                { quickReplies: { quickReplies: STANDARD_QRB_SIMPLE } }
              ]
            };
          } else {
            return {
              fulfillmentMessages: [
                { text: { text: [`Transfer failed: ${result.error}`] } },
                { quickReplies: { quickReplies: STANDARD_QRB_SIMPLE } }
              ]
            };
          }
        }

        // === TRANSACTION HISTORY ===
        case 'transaction.history': {
          const transactions = await BankingService.getTransactions(undefined, 5);
          
          if (transactions.length === 0) {
            return {
              fulfillmentMessages: [
                { text: { text: ['No recent transactions found.'] } },
                { quickReplies: { quickReplies: STANDARD_QRB_SIMPLE } }
              ]
            };
          }
          
          let text = 'Recent transactions:\n\n';
          transactions.forEach((t, i) => {
            text += `${i + 1}. ${t.date} - ${t.description} (${formatCurrency(t.amount)})\n`;
          });
          
          return {
            fulfillmentMessages: [
              { text: { text: [text] } },
              { quickReplies: { quickReplies: STANDARD_QRB_SIMPLE } }
            ]
          };
        }

        // === AGENT TRANSFER ===
        case 'request.agent':
          return {
            fulfillmentText: 'Connecting you to a live agent...',
            fulfillmentMessages: [{
              platform: 'PLATFORM_UNSPECIFIED',
              payload: { 
                action: 'TRANSFER_AGENT', 
                message: 'Connecting to agent...' 
              }
            }]
          };

        // === FALLBACK ===
        case 'Default Fallback Intent':
          return {
            fulfillmentMessages: [
              { text: { text: ['I can help with:\n• Hours and locations\n• Routing numbers and contact info\n• Account balances and transfers\n• Transaction history\n\nType "Talk to Agent" for live support.'] } },
              { quickReplies: { quickReplies: STANDARD_QRB_SIMPLE } }
            ]
          };

        // === KNOWLEDGE BASE INTENTS ===
        // These are handled by Dialogflow KB, just ensure QRBs are added
        default:
          if (KB_INTENTS.includes(intentName)) {
            // KB response will come from Dialogflow, we just add QRBs
            return {
              fulfillmentMessages: [
                { quickReplies: { quickReplies: STANDARD_QRB_SIMPLE } }
              ]
            };
          }
          
          // Unknown intent
          return {
            fulfillmentMessages: [
              { text: { text: ['I can help with hours, locations, balances, transfers, and more.'] } },
              { quickReplies: { quickReplies: STANDARD_QRB_SIMPLE } }
            ]
          };
      }
      
    } catch (error) {
      console.error('Fulfillment Error:', error);
      return {
        fulfillmentMessages: [
          { text: { text: ['I encountered an error. Please try again or contact support.'] } },
          { quickReplies: { quickReplies: STANDARD_QRB_SIMPLE } }
        ]
      };
    }
  }
};