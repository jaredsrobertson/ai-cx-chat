import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';
import { mockUsers } from '@/lib/mockData';

// --- Helper Functions ---

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function buildFulfillmentResponse(customPayload = null, overrideText = null) {
  const response = { fulfillmentMessages: [] };
  if (overrideText) {
    response.fulfillmentText = overrideText;
    response.fulfillmentMessages.push({ text: { text: [overrideText] } });
  }
  if (customPayload) {
    response.fulfillmentMessages.unshift({ payload: customPayload });
  }
  return response;
}

function getAuthMessage(intentName) {
  const messages = {
    'account.balance': "Please log in to view your account balances.",
    'account.transfer': "Please log in to process transfers.",
    'transaction.history': "Please log in to view your transaction history."
  };
  return messages[intentName] || "Please log in to access your account.";
}

function buildAuthRequiredResponse(intentName) {
  return buildFulfillmentResponse({
    action: 'AUTH_REQUIRED',
    intentName: intentName,
    authMessage: getAuthMessage(intentName)
  });
}

function buildBalanceResponse(user) {
  const confidentialData = {
    type: 'balances',
    accounts: [
      { name: 'Checking', balance: user.accounts.checking.balance },
      { name: 'Savings', balance: user.accounts.savings.balance }
    ]
  };
  
  const totalBalance = user.accounts.checking.balance + user.accounts.savings.balance;
  const speakableText = `Here are your current account balances. Your checking account has ${formatCurrency(user.accounts.checking.balance)} and your savings account has ${formatCurrency(user.accounts.savings.balance)}.`;
  
  return buildFulfillmentResponse({ confidentialData }, speakableText);
}

function buildTransactionHistoryResponse(user) {
  const confidentialData = {
    type: 'transaction_history',
    transactions: user.accounts.checking.recent.slice(0, 5).map(tx => ({
      date: tx.date,
      description: tx.description,
      amount: tx.amount
    }))
  };
  
  const speakableText = "Here are your recent transactions from your checking account.";
  return buildFulfillmentResponse({ confidentialData }, speakableText);
}

function buildTransferConfirmationResponse(amount, source, destination, sessionPath) {
  const confirmationText = `Perfect! Just to confirm, you want to transfer ${formatCurrency(amount)} from ${source} to ${destination}. Is that correct?`;
  return {
    fulfillmentText: confirmationText,
    fulfillmentMessages: [{ text: { text: [confirmationText] } }],
    outputContexts: [{
      name: `${sessionPath}/contexts/awaiting_transfer_confirmation`,
      lifespanCount: 2,
      parameters: { 
        amount: amount, 
        source_account: source, 
        destination_account: destination 
      }
    }]
  };
}

function buildTransferCompletionResponse(amount, source, destination) {
  const confidentialData = {
    type: 'transfer_confirmation',
    details: { amount, fromAccount: source, toAccount: destination }
  };
  
  const speakableText = `Transfer completed! I've moved ${formatCurrency(amount)} from your ${source} account to your ${destination} account.`;
  return buildFulfillmentResponse({ confidentialData }, speakableText);
}

function getUserFromToken(user) {
  // If user is already parsed from JWT, return it
  if (user && user.accounts) {
    return user;
  }
  
  // If we have a userId, look up the full user data
  if (user && user.userId) {
    const fullUser = mockUsers[user.userId];
    if (fullUser) {
      const { pin, ...userData } = fullUser;
      return userData;
    }
  }
  
  return null;
}

// --- Intent Handlers ---

async function handleAccountBalance(parameters, user, session) {
  const fullUser = getUserFromToken(user);
  if (!fullUser) {
    return buildAuthRequiredResponse('account.balance');
  }
  
  logger.debug('Processing balance request', { userId: fullUser.id });
  return buildBalanceResponse(fullUser);
}

async function handleTransactionHistory(parameters, user, session) {
  const fullUser = getUserFromToken(user);
  if (!fullUser) {
    return buildAuthRequiredResponse('transaction.history');
  }
  
  logger.debug('Processing transaction history request', { userId: fullUser.id });
  return buildTransactionHistoryResponse(fullUser);
}

async function handleAccountTransfer(parameters, user, session) {
  const fullUser = getUserFromToken(user);
  if (!fullUser) {
    return buildAuthRequiredResponse('account.transfer');
  }
  
  logger.debug('Processing transfer request', { 
    userId: fullUser.id, 
    parameters: JSON.stringify(parameters) 
  });
  
  // Extract parameters - handle different parameter formats
  let amount = parameters.amount;
  if (typeof amount === 'object' && amount !== null) {
    amount = amount.amount || amount.number || parseFloat(Object.values(amount)[0]);
  }
  amount = parseFloat(amount);
  
  const source = parameters.source_account || parameters['source-account'] || parameters.from;
  const destination = parameters.destination_account || parameters['destination-account'] || parameters.to;

  // Validation
  if (!amount || amount <= 0) {
    return buildFulfillmentResponse(null, "Please provide a valid transfer amount greater than zero.");
  }
  
  if (!source || !destination) {
    return buildFulfillmentResponse(null, "Please specify both the source and destination accounts for the transfer.");
  }
  
  if (source === destination) {
    return buildFulfillmentResponse(null, "You can't transfer money to the same account. Please choose different source and destination accounts.");
  }
  
  // Check account exists and has sufficient funds
  if (!fullUser.accounts[source]) {
    return buildFulfillmentResponse(null, `I couldn't find your ${source} account. Please check the account name.`);
  }
  
  if (!fullUser.accounts[destination]) {
    return buildFulfillmentResponse(null, `I couldn't find your ${destination} account. Please check the account name.`);
  }
  
  if (amount > fullUser.accounts[source].balance) {
    return buildFulfillmentResponse(null, `Insufficient funds. Your ${source} account balance is ${formatCurrency(fullUser.accounts[source].balance)}.`);
  }

  return buildTransferConfirmationResponse(amount, source, destination, session);
}

async function handleTransferConfirmation(parameters, user, session, outputContexts) {
  const fullUser = getUserFromToken(user);
  if (!fullUser) {
    return buildFulfillmentResponse(null, "Your session expired. Please start the transfer again.");
  }
  
  // Find the transfer context
  const transferContext = outputContexts?.find(ctx => 
    ctx.name.includes('awaiting_transfer_confirmation') || 
    ctx.name.includes('accounttransfer-followup')
  );
  
  if (!transferContext || !transferContext.parameters) {
    logger.warn('Transfer context not found', { 
      contexts: outputContexts?.map(ctx => ctx.name),
      userId: fullUser.id 
    });
    return buildFulfillmentResponse(null, "I couldn't find the transfer details. Please start the transfer process again.");
  }

  const { amount, source_account, destination_account } = transferContext.parameters;
  
  if (!amount || !source_account || !destination_account) {
    logger.warn('Incomplete transfer parameters', { 
      amount, 
      source_account, 
      destination_account,
      userId: fullUser.id 
    });
    return buildFulfillmentResponse(null, "Transfer details are incomplete. Please start over with a new transfer request.");
  }

  // Log the successful transfer (in a real app, this would update the database)
  logger.info('Transfer completed', { 
    userId: fullUser.id, 
    amount, 
    source: source_account, 
    destination: destination_account 
  });
  
  return buildTransferCompletionResponse(amount, source_account, destination_account);
}

async function handleAgentHandoff(parameters, user, session) {
  const speakableText = "I'm connecting you with a live agent who can provide personalized assistance. Please hold on.";
  return buildFulfillmentResponse({ action: 'AGENT_HANDOFF' }, speakableText);
}

async function handleDefault(parameters, user, session) {
  const speakableText = "I can help you check balances, view transactions, transfer funds, or connect you with a live agent. What would you like to do?";
  return buildFulfillmentResponse(null, speakableText);
}

async function handleGreeting(parameters, user, session) {
  const fullUser = getUserFromToken(user);
  const userName = fullUser ? fullUser.name.split(' ')[0] : '';
  const speakableText = fullUser 
    ? `Hello ${userName}! I'm your CloudBank assistant. I can help you check balances, view transactions, transfer funds, or connect you with a live agent. How can I assist you today?`
    : "Welcome to CloudBank! I can help you with your banking needs. Please note that you'll need to log in to access account-specific information. How can I assist you today?";
  
  return buildFulfillmentResponse(null, speakableText);
}

// Intent handler mapping - only the actual intents that exist
const intentHandlers = {
  'account.balance': handleAccountBalance,
  'transaction.history': handleTransactionHistory,
  'account.transfer': handleAccountTransfer,
  'account.transfer - yes': handleTransferConfirmation,
  'agent.handoff': handleAgentHandoff,
  'Default Welcome Intent': handleGreeting,
  'Default Fallback Intent': handleDefault
};

// --- Main Exported Handler ---

export default async function handler(req, res) {
  // Method validation
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { queryResult, session } = req.body;
    
    // Validate request body
    if (!queryResult) {
      logger.warn('Webhook received invalid request body', { 
        hasBody: !!req.body,
        bodyKeys: Object.keys(req.body || {})
      });
      return res.status(400).json({ 
        fulfillmentText: "I'm having trouble processing your request. Please try again." 
      });
    }

    let user = null;
    
    // 🚨 ENHANCED TOKEN EXTRACTION - Handle multiple payload formats
    const payload = queryResult.queryParams?.payload;
    let token = null;
    
    if (payload) {
      logger.debug('Webhook received payload', { 
        hasPayload: !!payload,
        hasFields: !!payload.fields,
        payloadKeys: Object.keys(payload || {})
      });
      
      // Try multiple extraction methods
      if (payload.fields && payload.fields.token) {
        // Method 1: Struct format with fields
        token = payload.fields.token.stringValue || payload.fields.token;
        logger.debug('Token extracted via fields.token.stringValue');
      } else if (payload.token) {
        // Method 2: Direct token property
        token = payload.token;
        logger.debug('Token extracted via direct payload.token');
      } else if (payload.fields) {
        // Method 3: Search through all fields
        for (const [key, value] of Object.entries(payload.fields)) {
          if (key === 'token' && value.stringValue) {
            token = value.stringValue;
            logger.debug('Token found in fields iteration');
            break;
          }
        }
      }
      
      // 🚨 TEMPORARY FULL PAYLOAD DEBUG (remove after testing)
      if (!token) {
        logger.debug('FULL PAYLOAD DEBUG - No token found', JSON.stringify(payload, null, 2));
      }
    }

    // 🚨 ADDITIONAL DEBUG LOGGING
    logger.debug('Token extraction result', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenStart: token ? token.substring(0, 20) + '...' : null
    });

    // Verify JWT token if present
    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
        logger.debug('Token verified successfully', { 
          userId: user.userId,
          username: user.username 
        });
      } catch (error) {
        logger.warn('Invalid JWT token in webhook', { 
          error: error.message,
          tokenLength: token.length 
        });
        user = null;
      }
    } else {
      logger.debug('No token found in webhook payload');
    }

    const intentName = queryResult.intent?.displayName;
    const parameters = queryResult.parameters || {};
    
    logger.debug('Processing intent', { 
      intentName, 
      hasUser: !!user,
      parametersCount: Object.keys(parameters).length,
      sessionId: session?.split('/').pop()
    });

    // List of intents that require authentication - only the actual ones
    const authRequiredIntents = [
      'account.balance', 
      'account.transfer', 
      'account.transfer - yes',
      'transaction.history'
    ];

    // Check if authentication is required
    if (authRequiredIntents.includes(intentName) && !user) {
      logger.debug('Authentication required for intent', { intentName });
      return res.status(200).json(buildAuthRequiredResponse(intentName));
    }

    // Get the appropriate handler function
    const handlerFn = intentHandlers[intentName] || handleDefault;
    
    // Execute the handler
    const responseData = await handlerFn(
      parameters, 
      user, 
      session, 
      queryResult.outputContexts
    );

    logger.debug('Handler execution completed', { 
      intentName,
      hasResponseData: !!responseData,
      hasCustomPayload: !!(responseData.fulfillmentMessages?.find(msg => msg.payload))
    });

    return res.status(200).json(responseData);

  } catch (error) {
    logger.error('Webhook fulfillment error', { 
      message: error.message, 
      stack: error.stack,
      intent: req.body?.queryResult?.intent?.displayName
    });
    
    return res.status(500).json({ 
      fulfillmentText: "I'm experiencing technical difficulties. Please try again in a moment." 
    });
  }
}