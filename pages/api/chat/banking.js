import { logger } from '@/lib/logger';
import { getUserById } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';
import { createApiHandler, createStandardResponse } from '@/lib/apiUtils';
import { parseDialogflowResponse } from '@/lib/dialogflowUtils';

// Helper to build Dialogflow webhook response format
function buildDialogflowWebhookResponse(fulfillmentText, payload = null) {
  const response = {
    fulfillmentText,
    fulfillmentMessages: [
      {
        text: {
          text: [fulfillmentText]
        }
      }
    ]
  };
  
  if (payload) {
    response.payload = {
      customData: payload
    };
  }
  
  return response;
}

// Intent response builders
function buildBalanceResponse(user) {
  const speakableText = `Here are your current account balances. Your checking account has ${formatCurrency(user.accounts.checking.balance)} and your savings account has ${formatCurrency(user.accounts.savings.balance)}.`;
  
  const confidentialData = {
    type: "balances",
    accounts: [
      { name: "Checking", balance: user.accounts.checking.balance },
      { name: "Savings", balance: user.accounts.savings.balance }
    ]
  };
  
  return {
    speakableText,
    confidentialData
  };
}

function buildTransactionHistoryResponse(user) {
  const speakableText = "Here are your most recent transactions from your checking account.";
  
  const confidentialData = {
    type: "transaction_history",
    transactions: user.accounts.checking.recent
  };
  
  return {
    speakableText,
    confidentialData
  };
}

function buildTransferConfirmationResponse(amount, fromAccount, toAccount, user) {
  // Parse the actual amount from Dialogflow parameters
  const transferAmount = typeof amount === 'object' ? amount.amount : amount;
  
  const speakableText = `I'll transfer ${formatCurrency(transferAmount)} from your ${fromAccount} to your ${toAccount} account. Please confirm this transfer.`;
  
  const confidentialData = {
    type: "transfer_confirmation",
    details: {
      amount: transferAmount,
      fromAccount,
      toAccount
    }
  };
  
  return {
    speakableText,
    confidentialData
  };
}

function buildAgentHandoffResponse() {
  return {
    speakableText: "I'll connect you with a live agent right away. One moment please.",
    action: "AGENT_HANDOFF"
  };
}

// Intent handlers
async function handleAccountBalance(user, queryResult) {
  logger.debug('Handling account.balance intent', { userId: user?.id });
  
  if (!user) {
    return {
      speakableText: "Please log in to view your account balances.",
      requiresAuth: true
    };
  }
  
  return buildBalanceResponse(user);
}

async function handleTransactionHistory(user, queryResult) {
  logger.debug('Handling transaction.history intent', { userId: user?.id });
  
  if (!user) {
    return {
      speakableText: "Please log in to view your transaction history.",
      requiresAuth: true
    };
  }
  
  return buildTransactionHistoryResponse(user);
}

async function handleTransfer(user, queryResult) {
  logger.debug('Handling account.transfer intent', { 
    userId: user?.id,
    parameters: queryResult.parameters 
  });
  
  if (!user) {
    return {
      speakableText: "Please log in to make a transfer.",
      requiresAuth: true
    };
  }
  
  // Extract parameters from Dialogflow
  const params = parseDialogflowResponse(queryResult.parameters?.fields) || {};
  const amount = params.amount;
  const sourceAccount = params.source_account || 'checking';
  const destAccount = params.destination_account || 'savings';
  
  return buildTransferConfirmationResponse(amount, sourceAccount, destAccount, user);
}

async function handleTransferConfirmation(user, queryResult) {
  logger.debug('Handling account.transfer - yes intent', { userId: user?.id });
  
  if (!user) {
    return {
      speakableText: "Please log in to complete the transfer.",
      requiresAuth: true
    };
  }
  
  // In production, you would actually process the transfer here
  const speakableText = "The transfer has been completed successfully.";
  
  return {
    speakableText,
    confidentialData: {
      type: "transfer_confirmation",
      details: {
        amount: 100, // Would come from context in production
        fromAccount: 'checking',
        toAccount: 'savings',
        status: 'completed'
      }
    }
  };
}

async function handleAgentHandoff(user, queryResult) {
  logger.debug('Handling agent.handoff intent');
  return buildAgentHandoffResponse();
}

async function handleDefault() {
  return {
    speakableText: "I can help with account balances, transactions, transfers, or connect you with an agent. What would you like to do?"
  };
}

const intentHandlers = {
  'account.balance': handleAccountBalance,
  'transaction.history': handleTransactionHistory,
  'account.transfer': handleTransfer,
  'account.transfer - yes': handleTransferConfirmation,
  'agent.handoff': handleAgentHandoff,
  'Default Fallback Intent': handleDefault
};

// Main webhook handler
const bankingWebhookHandler = async (req, res, user) => {
  const { queryResult, session } = req.body;
  
  if (!queryResult) {
    logger.error('Invalid Dialogflow request - missing queryResult');
    return res.status(400).json(createStandardResponse(false, null, "Invalid Dialogflow request"));
  }
  
  const intentName = queryResult.intent?.displayName;
  logger.info('Processing banking webhook', { 
    intentName, 
    hasUser: !!user,
    session 
  });
  
  const handlerFn = intentHandlers[intentName] || handleDefault;
  
  try {
    // Call the appropriate handler
    const responseData = await handlerFn(user, queryResult);
    
    // Check if this is for Dialogflow webhook or internal API
    if (req.headers['user-agent']?.includes('Google-Dialogflow')) {
      // Return Dialogflow webhook format
      const webhookResponse = buildDialogflowWebhookResponse(
        responseData.speakableText,
        responseData
      );
      return res.status(200).json(webhookResponse);
    } else {
      // Return internal API format
      return res.status(200).json(createStandardResponse(true, responseData));
    }
  } catch (error) {
    logger.error('Error in banking webhook handler', error);
    return res.status(500).json(createStandardResponse(false, null, "Failed to process request"));
  }
};

export default createApiHandler(bankingWebhookHandler, {
  allowedMethods: ['POST'],
  requireAuth: false, // We handle auth internally based on intent
});