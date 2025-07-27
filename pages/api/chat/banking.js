import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';
import { mockUsers, getUserById } from '@/lib/mockData';
import { getSessionToken } from '@/lib/dialogflow';
import { formatCurrency } from '@/lib/utils'; // Correctly import formatCurrency

// Helper to build the final JSON response for Dialogflow
function buildFulfillmentResponse(payload) {
  return {
    fulfillmentMessages: [{ payload }],
  };
}

// Helper to build a structured payload for the frontend
function buildCustomPayload({ speakableText, action, intentName, confidentialData, authMessage }) {
  const payload = {
    fields: {
      speakableText: { stringValue: speakableText || authMessage || '' },
      ...(action && { action: { stringValue: action } }),
      ...(intentName && { intentName: { stringValue: intentName } }),
      ...(confidentialData && { confidentialData: { structValue: formatAsStruct(confidentialData) } }),
      ...(authMessage && { authMessage: { stringValue: authMessage } }),
    }
  };
  return payload;
}

// Recursively formats a JS object into Dialogflow's Struct format
function formatAsStruct(obj) {
  const fields = {};
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { numberValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { boolValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = { listValue: { values: value.map(item => ({ structValue: formatAsStruct(item) })) } };
    } else if (typeof value === 'object' && value !== null) {
      fields[key] = { structValue: formatAsStruct(value) };
    }
  }
  return { fields };
}


function buildAuthRequiredResponse(intentName) {
  const payload = buildCustomPayload({
    action: 'AUTH_REQUIRED',
    intentName,
    authMessage: "Please log in to view your account information.",
    speakableText: "Please log in to view your account information."
  });
  return buildFulfillmentResponse(payload);
}

function buildBalanceResponse(user) {
  const speakableText = `Here are your current account balances. Your checking account has ${formatCurrency(user.accounts.checking.balance)} and your savings account has ${formatCurrency(user.accounts.savings.balance)}.`;
  const payload = buildCustomPayload({
    speakableText,
    confidentialData: {
      type: "balances",
      accounts: [
        { name: "Checking", balance: user.accounts.checking.balance },
        { name: "Savings", balance: user.accounts.savings.balance }
      ]
    }
  });
  return buildFulfillmentResponse(payload);
}

function buildTransactionHistoryResponse(user) {
    const speakableText = "Here are your most recent transactions from your checking account.";
    const payload = buildCustomPayload({
        speakableText,
        confidentialData: {
            type: "transaction_history",
            transactions: user.accounts.checking.recent,
        },
    });
    return buildFulfillmentResponse(payload);
}

function buildTransferConfirmationResponse(user, amount, fromAccount, toAccount) {
    const speakableText = `The transfer of ${formatCurrency(amount)} has been completed successfully.`;
    const payload = buildCustomPayload({
        speakableText,
        confidentialData: {
            type: "transfer_confirmation",
            details: {
                amount,
                fromAccount,
                toAccount,
            },
        },
    });
    return buildFulfillmentResponse(payload);
}


function getUserFromToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded && decoded.userId ? getUserById(decoded.userId) : null;
  } catch (error) {
    logger.error('JWT verification failed in webhook', { error: error.message });
    return null;
  }
}

// --- Intent Handlers ---
async function handleAccountBalance(sessionId) {
  const token = getSessionToken(sessionId);
  const user = getUserFromToken(token);
  if (!user) return buildAuthRequiredResponse('account.balance');
  
  return buildBalanceResponse(user);
}

async function handleTransactionHistory(sessionId) {
    const token = getSessionToken(sessionId);
    const user = getUserFromToken(token);
    if (!user) return buildAuthRequiredResponse('transaction.history');

    return buildTransactionHistoryResponse(user);
}

async function handleTransfer(sessionId, parameters) {
    const token = getSessionToken(sessionId);
    const user = getUserFromToken(token);
    if (!user) return buildAuthRequiredResponse('account.transfer');

    const amount = parameters.fields.amount.structValue.fields.amount.numberValue;
    const fromAccount = 'checking'; // Simplified for demo
    const toAccount = 'savings'; // Simplified for demo
    
    return buildTransferConfirmationResponse(user, amount, fromAccount, toAccount);
}

async function handleDefault() {
  const payload = buildCustomPayload({
    speakableText: "I can help with account balances, transactions, and transfers. How can I assist?"
  });
  return buildFulfillmentResponse(payload);
}

const intentHandlers = {
  'account.balance': handleAccountBalance,
  'transaction.history': handleTransactionHistory,
  'account.transfer - yes': handleTransfer,
  'Default Fallback Intent': handleDefault
};

// --- Main Handler ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { queryResult, session } = req.body;
    const sessionId = session ? session.split('/').pop() : null;

    if (!queryResult || !sessionId) {
      return res.status(400).json({ fulfillmentText: "Invalid request." });
    }

    const intentName = queryResult.intent?.displayName;
    const parameters = queryResult.parameters;
    const handlerFn = intentHandlers[intentName] || handleDefault;
    
    const responseData = await handlerFn(sessionId, parameters);
    
    return res.status(200).json(responseData);

  } catch (error) {
    logger.error('Webhook error:', error);
    return res.status(500).json({ 
      fulfillmentText: "I'm experiencing technical difficulties. Please try again." 
    });
  }
}