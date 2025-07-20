// pages/api/chat/banking.js - Final Implementation with Clean Responses

import { createApiHandler } from '@/lib/apiUtils';
import { logger } from '@/lib/logger';
import { mockUsers } from '@/lib/mockData';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

/**
 * Builds a standard Dialogflow fulfillment response
 * We let Dialogflow handle the consistent response text
 * We provide data payloads for rich display
 */
function buildFulfillmentResponse(customPayload = null, overrideText = null) {
  const response = {};

  // Only override fulfillment text when absolutely necessary
  if (overrideText) {
    response.fulfillmentText = overrideText;
    response.fulfillmentMessages = [
      {
        text: {
          text: [overrideText]
        }
      }
    ];
  }

  // Add custom payload for rich responses
  if (customPayload) {
    if (!response.fulfillmentMessages) {
      response.fulfillmentMessages = [];
    }
    response.fulfillmentMessages.unshift({
      payload: customPayload
    });
  }

  return response;
}

/**
 * Builds auth required response
 */
function buildAuthRequiredResponse(intentName) {
  return buildFulfillmentResponse({
    action: 'AUTH_REQUIRED',
    intentName: intentName,
    authMessage: getAuthMessage(intentName)
  });
}

function getAuthMessage(intentName) {
  const messages = {
    'account.balance': "Please log in to view your account balances.",
    'account.transfer': "Please log in to process transfers.",
    'transaction.history': "Please log in to view your transaction history."
  };
  return messages[intentName] || "Please log in to access your account.";
}

/**
 * Builds balance response with confidential data
 */
function buildBalanceResponse(user) {
  const confidentialData = {
    type: 'balances',
    accounts: [
      {
        name: 'Checking',
        balance: user.accounts.checking.balance
      },
      {
        name: 'Savings', 
        balance: user.accounts.savings.balance
      }
    ]
  };

  return buildFulfillmentResponse({
    confidentialData: confidentialData
  });
}

/**
 * Builds transaction history response
 */
function buildTransactionHistoryResponse(user) {
  const confidentialData = {
    type: 'transaction_history',
    transactions: user.accounts.checking.recent.slice(0, 5).map(tx => ({
      date: tx.date,
      description: tx.description,
      amount: tx.amount
    }))
  };

  return buildFulfillmentResponse({
    confidentialData: confidentialData
  });
}

/**
 * Builds transfer confirmation response with context
 */
function buildTransferConfirmationResponse(amount, source, destination, sessionPath) {
  const confirmationText = `Perfect! Just to confirm, you want to transfer ${formatCurrency(amount)} from ${source} to ${destination}. Is that correct?`;
  
  return {
    fulfillmentText: confirmationText,
    fulfillmentMessages: [
      {
        text: {
          text: [confirmationText]
        }
      }
    ],
    outputContexts: [
      {
        name: `${sessionPath}/contexts/awaiting_transfer_confirmation`,
        lifespanCount: 2,
        parameters: {
          amount: amount,
          source_account: source,
          destination_account: destination
        }
      }
    ]
  };
}

/**
 * Builds transfer completion response
 */
function buildTransferCompletionResponse(amount, source, destination) {
  const confidentialData = {
    type: 'transfer_confirmation',
    details: {
      amount: amount,
      fromAccount: source,
      toAccount: destination
    }
  };

  return buildFulfillmentResponse({
    confidentialData: confidentialData
  });
}

// --- Intent Handler Functions ---

async function handleAccountBalance(parameters, user, session) {
  logger.debug('Processing account balance request', { 
    userId: user?.userId || 'unauthenticated'
  });

  if (!user) {
    return buildAuthRequiredResponse('account.balance');
  }

  // Dialogflow says: "Here are your current account balances"
  // We provide: The actual balance data
  return buildBalanceResponse(user);
}

async function handleTransactionHistory(parameters, user, session) {
  logger.debug('Processing transaction history request', {
    userId: user?.userId || 'unauthenticated'
  });

  if (!user) {
    return buildAuthRequiredResponse('transaction.history');
  }

  // Dialogflow says: "Here are your recent transactions"
  // We provide: The actual transaction data
  return buildTransactionHistoryResponse(user);
}

async function handleAccountTransfer(parameters, user, session) {
  logger.debug('Processing transfer request', {
    userId: user?.userId || 'unauthenticated',
    parameters: parameters
  });

  if (!user) {
    return buildAuthRequiredResponse('account.transfer');
  }

  // Extract parameters - Dialogflow slot filling ensures these are present
  const amount = parameters.amount?.amount || parameters.amount;
  const source = parameters.source_account;
  const destination = parameters.destination_account;

  logger.debug('Transfer parameters extracted', { amount, source, destination });

  // Validate amount
  if (!amount || amount <= 0) {
    return buildFulfillmentResponse(null, "I need a valid transfer amount greater than zero. Please try again.");
  }

  // Validate accounts exist and are valid
  if (!['checking', 'savings'].includes(source) || !['checking', 'savings'].includes(destination)) {
    return buildFulfillmentResponse(null, "I can only transfer between your checking and savings accounts.");
  }

  // Business rule: Can't transfer to same account
  if (source === destination) {
    return buildFulfillmentResponse(null, "You can't transfer funds to the same account. Please choose different accounts.");
  }

  // Business rule: Check sufficient funds
  const sourceBalance = user.accounts[source].balance;
  if (amount > sourceBalance) {
    return buildFulfillmentResponse(null, `Insufficient funds. Your ${source} account balance is ${formatCurrency(sourceBalance)}.`);
  }

  // All validations passed - create confirmation
  return buildTransferConfirmationResponse(amount, source, destination, session);
}

async function handleTransferConfirmation(parameters, user, session, outputContexts) {
  logger.debug('Processing transfer confirmation', {
    userId: user?.userId || 'unauthenticated'
  });

  if (!user) {
    return buildFulfillmentResponse(null, "Your session has expired. Please start the transfer process again.");
  }

  // Find the transfer confirmation context
  const transferContext = outputContexts?.find(ctx => 
    ctx.name.includes('awaiting_transfer_confirmation')
  );

  if (!transferContext) {
    return buildFulfillmentResponse(null, "I couldn't find the transfer details. Please start over.");
  }

  // Extract transfer details from context
  const amount = transferContext.parameters?.amount;
  const source = transferContext.parameters?.source_account;
  const destination = transferContext.parameters?.destination_account;

  if (!amount || !source || !destination) {
    return buildFulfillmentResponse(null, "Transfer details are incomplete. Please start over.");
  }

  // Log the completed transfer
  logger.info('Transfer completed', {
    userId: user.userId,
    amount,
    source,
    destination
  });

  // Dialogflow says: "Processing your transfer now"
  // We provide: Completion data for rich display
  return buildTransferCompletionResponse(amount, source, destination);
}

async function handleAgentHandoff(parameters, user, session) {
  logger.debug('Processing agent handoff request');
  
  // Dialogflow says: "Let me connect you with a live agent"
  // We provide: The handoff action
  return buildFulfillmentResponse({
    action: 'AGENT_HANDOFF'
  });
}

async function handleDefault(parameters, user, session) {
  // Override with capability message for fallback/welcome
  return buildFulfillmentResponse(null, 
    "I'm your CloudBank assistant. I can help you check account balances, view recent transactions, transfer funds between accounts, or connect you with a live agent. What would you like to do?"
  );
}

// --- Intent Router ---
const intentHandlers = {
  'account.balance': handleAccountBalance,
  'transaction.history': handleTransactionHistory,
  'account.transfer': handleAccountTransfer,
  'account.transfer - yes': handleTransferConfirmation,
  'agent.handoff': handleAgentHandoff,
  'Default Welcome Intent': handleDefault,
  'Default Fallback Intent': handleDefault
};

// --- Main Webhook Handler ---
const bankingWebhookHandler = async (req, res, user) => {
  try {
    const { queryResult } = req.body;
    const intentName = queryResult?.intent?.displayName;
    const session = queryResult?.session;
    
    logger.debug('Webhook fulfillment request received', {
      intent: intentName,
      authenticated: !!user,
      sessionId: session?.split('/').pop(),
      hasParameters: !!queryResult?.parameters && Object.keys(queryResult.parameters).length > 0
    });

    // Get the appropriate handler
    const handler = intentHandlers[intentName] || handleDefault;
    
    // Execute the handler
    const responseData = await handler(
      queryResult?.parameters,
      user,
      session,
      queryResult?.outputContexts
    );

    logger.debug('Webhook fulfillment response generated', {
      intent: intentName,
      hasCustomPayload: !!responseData.fulfillmentMessages?.find(msg => msg.payload),
      hasOverrideText: !!responseData.fulfillmentText,
      hasOutputContexts: !!responseData.outputContexts?.length
    });

    return res.status(200).json(responseData);

  } catch (error) {
    logger.error('Webhook fulfillment error', error);
    
    // Return fallback response
    return res.status(200).json({
      fulfillmentText: "I'm experiencing technical difficulties. Please try again in a moment."
    });
  }
};

export default createApiHandler(bankingWebhookHandler, {
  allowedMethods: ['POST'],
});