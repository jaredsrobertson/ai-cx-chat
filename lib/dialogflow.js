import dialogflow from '@google-cloud/dialogflow';
import { classifyIntent } from './openai';
import { logger } from './logger';

let sessionClient = null;
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

if (!projectId) {
  logger.error("FATAL: GOOGLE_CLOUD_PROJECT_ID must be set.");
} else {
  try {
    // No need to parse credentials if they are already in the environment variable
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const config = {
      projectId: projectId,
      keyFilename: credentialsPath,
    };
    sessionClient = new dialogflow.SessionsClient(config);
  } catch (clientError) {
    logger.error("FATAL: Failed to initialize Dialogflow client.", clientError);
  }
}

export async function detectIntent(sessionId, queryText, languageCode = 'en-US') {
  if (!sessionClient) {
    logger.error("Dialogflow client not initialized, returning fallback.");
    return {
      intent: { displayName: 'Default Fallback Intent' },
      fulfillmentText: "I'm sorry, my banking services are currently unavailable due to a configuration issue.",
      queryText: queryText
    };
  }
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  const request = {
    session: sessionPath,
    queryInput: {
      text: { text: queryText, languageCode: languageCode },
    },
  };

  try {
    const [response] = await sessionClient.detectIntent(request);
    return response.queryResult;
  } catch (error) {
    logger.error('Dialogflow detectIntent error:', error);
    throw error;
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

async function handleWelcome() {
  return { speakableText: "Welcome to the SecureBank Concierge. I can help you with account balances, transaction history, and fund transfers. You can also ask to speak with a live agent." };
}

async function handleFallback() {
  return { speakableText: "I'm sorry, I didn't quite understand. I can help with account balances, transaction history, and fund transfers. You can also ask to speak with a live agent." };
}

async function handleAgentHandoff() {
  return { speakableText: "I understand. Let me connect you to a live agent." };
}

async function handleBalanceQuery(queryResult, userContext) {
  if (!userContext?.user) return { speakableText: "For security, please log in to view your account balance." };

  const params = queryResult.parameters?.fields || {};
  const requestedAccount = params.account?.stringValue;
  const { accounts } = userContext.user;

  if (requestedAccount && accounts[requestedAccount]) {
    return {
      speakableText: `Your ${requestedAccount} account balance is ${formatCurrency(accounts[requestedAccount].balance)}.`,
      confidentialData: {
        type: 'balances',
        accounts: [{ name: requestedAccount, balance: accounts[requestedAccount].balance }]
      }
    };
  } else {
    return {
      speakableText: "Here are your current account balances.",
      confidentialData: {
        type: 'balances',
        accounts: [
          { name: 'Checking', balance: accounts.checking.balance },
          { name: 'Savings', balance: accounts.savings.balance }
        ]
      }
    };
  }
}

async function handleTransactionHistory(queryResult, userContext) {
  if (!userContext?.user) return { speakableText: "Please log in to view your transaction history." };
  
  const account = userContext.user.accounts.checking;
  
  return {
    speakableText: `Here are your recent transactions.`,
    confidentialData: {
      type: 'transaction_history',
      transactions: account.recent.slice(0, 3)
    }
  };
}

async function handleTransferRequest(queryResult, userContext) {
  if (!userContext?.user) {
      return { speakableText: "I can help with that. Please log in to transfer funds securely." };
  }

  const params = queryResult.parameters?.fields || {};
  const amount = params.amount?.structValue?.fields?.amount?.numberValue;
  let fromAccount = params.source_account?.stringValue;
  let toAccount = params.destination_account?.stringValue;

  if (!amount) {
      return { speakableText: "I can help you transfer funds. Please tell me the amount and which accounts you'd like to transfer between."};
  }

  if (fromAccount && !toAccount) {
      toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
  } else if (!fromAccount && toAccount) {
      fromAccount = toAccount === 'checking' ? 'savings' : 'checking';
  }

  if (!fromAccount || !toAccount) {
      return { speakableText: "Which account would you like to transfer from, and to which account?" };
  }
  
  if (fromAccount === toAccount) {
      return { speakableText: "You can't transfer funds to the same account. Please specify a different destination account." };
  }

  queryResult.parameters.fields.source_account = { stringValue: fromAccount, kind: 'stringValue' };
  queryResult.parameters.fields.destination_account = { stringValue: toAccount, kind: 'stringValue' };

  return { 
    speakableText: `You got it. Just to confirm, you want to transfer ${formatCurrency(amount)} from ${fromAccount} to ${toAccount}. Is that correct?`
  };
}

async function handleTransferConfirmation(queryResult, userContext) {
  if (!userContext?.user) return { speakableText: "There was an error. Please try the transfer again." };

  const transferContext = queryResult.outputContexts?.find(
    ctx => ctx.name.includes('accounttransfer-followup')
  );

  if (transferContext?.parameters?.fields) {
    const contextParams = transferContext.parameters.fields;
    const amount = contextParams.amount?.structValue?.fields?.amount?.numberValue;
    let fromAccount = contextParams.source_account?.stringValue;
    let toAccount = contextParams.destination_account?.stringValue;
    
    if (!toAccount && fromAccount) {
      toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
    }
    
    if (!fromAccount && toAccount) {
      fromAccount = toAccount === 'checking' ? 'savings' : 'checking';
    }
    
    logger.debug('Final transfer confirmation params', { amount, fromAccount, toAccount });

    if (amount && fromAccount && toAccount) {
      return { 
        speakableText: "The transfer has been completed successfully.",
        confidentialData: {
          type: 'transfer_confirmation',
          details: { amount: parseFloat(amount), fromAccount, toAccount }
        }
      };
    }
  }

  logger.error("Failed to extract transfer parameters from context.", { contexts: queryResult.outputContexts });
  return { speakableText: "I'm sorry, something went wrong and I couldn't complete the transfer. Please try again." };
}

const intentHandlers = {
  'Default Welcome Intent': handleWelcome,
  'Default Fallback Intent': handleFallback,
  'agent.handoff': handleAgentHandoff,
  'account.balance': handleBalanceQuery,
  'account.transfer': handleTransferRequest,
  'account.transfer - yes': handleTransferConfirmation,
  'transaction.history': handleTransactionHistory
};

export async function handleBankingIntent(queryResult, userContext) {
  let intentName = queryResult.intent?.displayName || 'Default Fallback Intent';
  let responsePayload;

  if (intentName === 'Default Fallback Intent') {
    const classifiedIntent = await classifyIntent(queryResult.queryText);
    if (classifiedIntent && classifiedIntent !== 'None') {
      logger.info(`Dialogflow fallback, OpenAI classified as: ${classifiedIntent}`);
      intentName = classifiedIntent;
    }
  }
  
  const handler = intentHandlers[intentName];
  
  if (handler) {
    responsePayload = await handler(queryResult, userContext);
  } else {
    logger.warn(`No handler found for intent: "${intentName}". Using fallback.`);
    responsePayload = await handleFallback(queryResult, userContext);
  }
  
  responsePayload.intentName = intentName;
  return responsePayload;
}