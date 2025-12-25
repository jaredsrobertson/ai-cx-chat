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

// NEW: Helper to clear "sticky" contexts (like transfer flows) while keeping Auth
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
          outputContexts: getAuthContext(contexts)
        };
      }

      case 'transfer.funds': {
        const amount = typeof parameters.amount === 'object' ? parameters.amount?.amount : parameters.amount;
        const fromAccount = parameters.fromAccount;
        let toAccount = parameters.toAccount;
        
        if (fromAccount && !toAccount) {
          toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
        }

        if (!amount || !fromAccount || !toAccount) {
           return { fulfillmentText: 'I need a bit more info. Please specify the amount and the account.' };
        }

        const result = await BankingService.processTransfer(fromAccount, toAccount, Number(amount));
        
        if (result.success) {
          const text = `Transfer complete! Moved ${formatCurrency(Number(amount))} from ${fromAccount} to ${toAccount}.`;
          return {
            fulfillmentText: text,
            fulfillmentMessages: [{ text: { text: [text] } }, { quickReplies: { quickReplies: standardQuickReplies } }],
            // CHANGE: Use the new helper to clear the transfer context
            outputContexts: clearTransferContexts(contexts) 
          };
        } else {
          return { 
            fulfillmentText: `Transfer failed: ${result.error}`,
            outputContexts: getAuthContext(contexts)
          };
        }
      }

      case 'transaction.history': {
        const transactions = await BankingService.getTransactions(undefined, 5);
        if (transactions.length === 0) {
          return { fulfillmentText: "No recent transactions found.", outputContexts: getAuthContext(contexts) };
        }
        
        let text = 'Recent transactions:\n\n';
        transactions.forEach((t, i) => {
          text += `${i+1}. ${t.date} - ${t.description} (${formatCurrency(t.amount)})\n`;
        });
        
        return {
          fulfillmentText: text,
          fulfillmentMessages: [{ text: { text: [text] } }, { quickReplies: { quickReplies: standardQuickReplies } }],
          outputContexts: getAuthContext(contexts)
        };
      }

      case 'request.agent':
        return {
          fulfillmentText: 'Transferring you to a live agent...',
          fulfillmentMessages: [{
            platform: 'PLATFORM_UNSPECIFIED',
            payload: { action: 'TRANSFER_AGENT', message: 'Transferring...' }
          }]
        };

      // Recommended: Add the explicit fallback handler here as discussed previously
      case 'Default Fallback Intent':
         return {
            fulfillmentText: 'I missed that. I can help with account balances, transfers, or transaction history.',
            fulfillmentMessages: [{ quickReplies: { quickReplies: standardQuickReplies } }]
         };

      default:
        return {
          fulfillmentText: 'I can help you check balances, transfer funds, or view recent transactions.',
          fulfillmentMessages: [{ quickReplies: { quickReplies: standardQuickReplies } }]
        };
    }
  }
};