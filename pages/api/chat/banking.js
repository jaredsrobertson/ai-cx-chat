// pages/api/chat/banking.js - FINAL
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';
import { mockUsers } from '@/lib/mockData';

// --- Helper Functions (These remain the same) ---

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
  return buildFulfillmentResponse({ confidentialData });
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
    return buildFulfillmentResponse({ confidentialData });
}

function buildTransferConfirmationResponse(amount, source, destination, sessionPath) {
  const confirmationText = `Perfect! Just to confirm, you want to transfer ${formatCurrency(amount)} from ${source} to ${destination}. Is that correct?`;
  return {
    fulfillmentText: confirmationText,
    outputContexts: [{
      name: `${sessionPath}/contexts/awaiting_transfer_confirmation`,
      lifespanCount: 2,
      parameters: { amount, source_account: source, destination_account: destination }
    }]
  };
}

function buildTransferCompletionResponse(amount, source, destination) {
  const confidentialData = {
    type: 'transfer_confirmation',
    details: { amount, fromAccount: source, toAccount: destination }
  };
  return buildFulfillmentResponse({ confidentialData });
}

// --- Intent Handlers (These remain the same) ---

async function handleAccountBalance(parameters, user, session) {
  if (!user) return buildAuthRequiredResponse('account.balance');
  return buildBalanceResponse(user);
}

async function handleTransactionHistory(parameters, user, session) {
  if (!user) return buildAuthRequiredResponse('transaction.history');
  return buildTransactionHistoryResponse(user);
}

async function handleAccountTransfer(parameters, user, session) {
  if (!user) return buildAuthRequiredResponse('account.transfer');
  const amount = parameters.amount?.amount || parameters.amount;
  const source = parameters.source_account;
  const destination = parameters.destination_account;

  if (!amount || amount <= 0) return buildFulfillmentResponse(null, "Please provide a valid transfer amount.");
  if (source === destination) return buildFulfillmentResponse(null, "You can't transfer to the same account.");
  if (amount > user.accounts[source].balance) return buildFulfillmentResponse(null, `Insufficient funds.`);

  return buildTransferConfirmationResponse(amount, source, destination, session);
}

async function handleTransferConfirmation(parameters, user, session, outputContexts) {
  if (!user) return buildFulfillmentResponse(null, "Your session expired. Please start the transfer again.");
  const transferContext = outputContexts?.find(ctx => ctx.name.includes('awaiting_transfer_confirmation'));
  if (!transferContext) return buildFulfillmentResponse(null, "I couldn't find the transfer details. Please start over.");

  const { amount, source_account, destination_account } = transferContext.parameters;
  if (!amount || !source_account || !destination_account) return buildFulfillmentResponse(null, "Details are incomplete. Please start over.");

  logger.info('Transfer completed', { userId: user.userId, amount, source: source_account, destination: destination_account });
  return buildTransferCompletionResponse(amount, source_account, destination_account);
}

async function handleAgentHandoff(parameters, user, session) {
  return buildFulfillmentResponse({ action: 'AGENT_HANDOFF' });
}

async function handleDefault(parameters, user, session) {
  return buildFulfillmentResponse(null, "I can help you check balances, view transactions, transfer funds, or connect you with a live agent. What would you like to do?");
}

const intentHandlers = {
  'account.balance': handleAccountBalance,
  'transaction.history': handleTransactionHistory,
  'account.transfer': handleAccountTransfer,
  'account.transfer - yes': handleTransferConfirmation,
  'agent.handoff': handleAgentHandoff,
  'Default Welcome Intent': handleDefault,
  'Default Fallback Intent': handleDefault
};

// --- Main Exported Handler ---

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { queryResult, session } = req.body;
    if (!queryResult) {
      logger.warn('Webhook received invalid request body', { body: req.body });
      return res.status(400).json({ error: 'Invalid Dialogflow request' });
    }

    let user = null;
    const token = queryResult.queryParams?.payload?.fields?.token?.stringValue;

    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        logger.warn('Webhook received an invalid JWT from Dialogflow payload', { error: error.message });
        user = null;
      }
    }

    const intentName = queryResult.intent?.displayName;
    const handlerFn = intentHandlers[intentName] || handleDefault;
    const responseData = await handlerFn(queryResult.parameters, user, session, queryResult.outputContexts);

    return res.status(200).json(responseData);

  } catch (error) {
    logger.error('Webhook fulfillment error', { message: error.message });
    return res.status(500).json({ fulfillmentText: "I'm experiencing technical difficulties. Please try again in a moment." });
  }
}