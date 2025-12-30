import { BankingService } from '@/lib/services/banking-service';

interface DialogflowContext {
  name: string;
  lifespanCount?: number;
  parameters?: Record<string, any>;
}

// Helper to check auth from Dialogflow contexts
function isAuthenticated(contexts: DialogflowContext[]): boolean {
  const authContext = contexts.find(ctx => ctx.name.endsWith('/contexts/authenticated'));
  return authContext?.parameters?.authenticated === true;
}

// Helper to maintain auth context
function getAuthContext(contexts: DialogflowContext[]) {
  const authContext = contexts.find(ctx => ctx.name.endsWith('/contexts/authenticated'));
  if (authContext) {
    return [{
      name: authContext.name,
      lifespanCount: 5, // Refresh lifespan to keep user logged in during conversation
      parameters: authContext.parameters || {}
    }];
  }
  return [];
}

// Helper to clear "sticky" contexts (like transfer flows) while keeping Auth
function clearTransferContexts(contexts: DialogflowContext[]) {
  const authContexts = getAuthContext(contexts);
  
  // Find all OTHER contexts and set lifespan to 0 to kill them immediately
  const contextsToClear = contexts
    .filter(ctx => !ctx.name.endsWith('/contexts/authenticated'))
    .map(ctx => ({
      name: ctx.name,
      lifespanCount: 0
    }));

  return [...authContexts, ...contextsToClear];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export const DialogflowFulfillment = {
  handleIntent: async (intentName: string, parameters: Record<string, any>, contexts: DialogflowContext[]) => {
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
    
    // 1. Auth Guard
    const protectedIntents = ['check.balance', 'transfer.funds', 'transaction.history'];
    if (protectedIntents.includes(intentName) && !isAuthenticated(contexts)) {
      return {
        fulfillmentText: 'I need to verify your identity first. Please authenticate to continue.',
        fulfillmentMessages: [{
          platform: 'PLATFORM_UNSPECIFIED',
          payload: { action: 'REQUIRE_AUTH', message: 'Please authenticate to proceed' }
        }]
      };
    }

    // 2. Intent Handling
    switch (intentName) {
      case 'Default Welcome Intent':
      case 'Welcome':
        return {
          fulfillmentText: 'Welcome to SecureBank! I can help you check balances, transfer funds, or view recent transactions.',
          fulfillmentMessages: [
            { text: { text: ['Welcome to SecureBank! I can help you check balances, transfer funds, or view recent transactions.'] } },
            { quickReplies: { quickReplies: standardQuickReplies } }
          ]
        };

      case 'check.balance': {
        const accounts = await BankingService.getAccounts();
        const checking = accounts.find(a => a.type === 'checking');
        const savings = accounts.find(a => a.type === 'savings');
        
        const text = `Here are your balances:\n\nChecking ${checking?.accountNumber}: ${formatCurrency(checking?.balance || 0)}\nSavings ${savings?.accountNumber}: ${formatCurrency(savings?.balance || 0)}`;
        
        return {
          fulfillmentText: text,
          fulfillmentMessages: [{ text: { text: [text] } }, { quickReplies: { quickReplies: standardQuickReplies } }],
          outputContexts: clearTransferContexts(contexts) // Clear sticky contexts
        };
      }

      case 'transfer.funds': {
        const amount = typeof parameters.amount === 'object' ? parameters.amount?.amount : parameters.amount;
        
        // Extract and normalize account parameters
        let fromAccount = parameters.fromAccount;
        let toAccount = parameters.toAccount;
        
        // Convert to lowercase and trim if they exist
        if (fromAccount && typeof fromAccount === 'string') {
          fromAccount = fromAccount.toLowerCase().trim();
        }
        if (toAccount && typeof toAccount === 'string') {
          toAccount = toAccount.toLowerCase().trim();
        }
        
        // Debug logging
        console.log('Transfer parameters received:', { 
          fromAccount, 
          toAccount,
          amount
        });
        
        // Inference logic for single-account mentions
        if (!fromAccount && toAccount) {
          // User said "transfer to checking" → infer from the opposite account
          fromAccount = toAccount === 'checking' ? 'savings' : 'checking';
          console.log('Inferred fromAccount:', fromAccount);
        } else if (fromAccount && !toAccount) {
          // User said "transfer from savings" → infer to the opposite account
          toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
          console.log('Inferred toAccount:', toAccount);
        }

        // Validate we have all required parameters
        if (!amount || !fromAccount || !toAccount) {
           console.log('Missing parameters after inference:', { amount, fromAccount, toAccount });
           return { 
             fulfillmentText: 'I need a bit more info. Please specify the amount and the account.',
             fulfillmentMessages: [{ 
               text: { text: ['I need a bit more info. Please specify the amount and the account.'] }
             }]
           };
        }

        // Process the transfer
        const result = await BankingService.processTransfer(fromAccount, toAccount, Number(amount));
        
        if (result.success) {
          const text = `Transfer complete! Moved ${formatCurrency(Number(amount))} from ${fromAccount} to ${toAccount}.`;
          console.log('Transfer successful:', { fromAccount, toAccount, amount });
          return {
            fulfillmentText: text,
            fulfillmentMessages: [{ text: { text: [text] } }, { quickReplies: { quickReplies: standardQuickReplies } }],
            outputContexts: clearTransferContexts(contexts) // Clear sticky contexts on success
          };
        } else {
          console.log('Transfer failed:', result.error);
          return { 
            fulfillmentText: `Transfer failed: ${result.error}`,
            fulfillmentMessages: [{ text: { text: [`Transfer failed: ${result.error}`] } }],
            outputContexts: getAuthContext(contexts)
          };
        }
      }

      case 'transaction.history': {
        // Simple demo implementation
        const transactions = await BankingService.getTransactions(undefined, 5);
        
        if (transactions.length === 0) {
          return { 
            fulfillmentText: "No recent transactions found.", 
            outputContexts: clearTransferContexts(contexts) 
          };
        }
        
        let text = 'Recent transactions:\n\n';
        transactions.forEach((t, i) => {
          text += `${i+1}. ${t.date} - ${t.description} (${formatCurrency(t.amount)})\n`;
        });
        
        return {
          fulfillmentText: text,
          fulfillmentMessages: [{ text: { text: [text] } }, { quickReplies: { quickReplies: standardQuickReplies } }],
          outputContexts: clearTransferContexts(contexts) // Clear sticky contexts
        };
      }

      case 'request.agent':
        return {
          fulfillmentText: 'Connecting you to a live agent now...',
          fulfillmentMessages: [{
            platform: 'PLATFORM_UNSPECIFIED',
            payload: { action: 'TRANSFER_AGENT', message: 'Connecting...' }
          }]
        };

      case 'Default Fallback Intent':
        return {
          fulfillmentText: 'I missed that. I can help with account balances, transfers, or transaction history.',
          fulfillmentMessages: [{ 
            text: { text: ['I missed that. I can help with account balances, transfers, or transaction history.'] }
          }, { 
            quickReplies: { quickReplies: standardQuickReplies } 
          }]
        };

      default:
        return {
          fulfillmentText: 'I can help you check balances, transfer funds, or view recent transactions.',
          fulfillmentMessages: [{ 
            text: { text: ['I can help you check balances, transfer funds, or view recent transactions.'] }
          }, { 
            quickReplies: { quickReplies: standardQuickReplies } 
          }]
        };
    }
  }
};