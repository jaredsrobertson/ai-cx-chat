import { logger } from '@/lib/logger';
import { mockUsers, getUserById } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';
import { createApiHandler, createStandardResponse } from '@/lib/apiUtils';

// Recursively formats a JS object into Dialogflow's Struct format
function formatAsStruct(obj) {
  if (obj === null) return { nullValue: null };

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
    } else {
      fields[key] = { nullValue: null };
    }
  }
  return { fields };
}

// Helper to build the final JSON response for Dialogflow
function buildFulfillmentResponse(payload) {
  return {
    fulfillmentMessages: [{
      payload: { fields: formatAsStruct(payload).fields }
    }],
  };
}

function buildBalanceResponse(user) {
  const speakableText = `Here are your current account balances. Your checking account has ${formatCurrency(user.accounts.checking.balance)} and your savings account has ${formatCurrency(user.accounts.savings.balance)}.`;
  return buildFulfillmentResponse({
    speakableText,
    confidentialData: {
      type: "balances",
      accounts: [
        { name: "Checking", balance: user.accounts.checking.balance },
        { name: "Savings", balance: user.accounts.savings.balance }
      ]
    }
  });
}

function buildTransactionHistoryResponse(user) {
    const speakableText = "Here are your most recent transactions from your checking account.";
    return buildFulfillmentResponse({
        speakableText,
        confidentialData: {
            type: "transaction_history",
            transactions: user.accounts.checking.recent,
        },
    });
}

function buildTransferConfirmationResponse(amount, fromAccount, toAccount) {
    const speakableText = `The transfer of ${formatCurrency(amount)} has been completed successfully.`;
    return buildFulfillmentResponse({
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
}

// --- Intent Handlers ---
async function handleAccountBalance(queryResult) {
  const userId = queryResult.parameters?.fields?.userId?.stringValue;
  if (!userId) {
    return buildFulfillmentResponse({ speakableText: "I can't access account details without user identification." });
  }
  const user = getUserById(userId);
  return buildBalanceResponse(user);
}

async function handleTransactionHistory(queryResult) {
  const userId = queryResult.parameters?.fields?.userId?.stringValue;
  if (!userId) {
    return buildFulfillmentResponse({ speakableText: "I can't access account details without user identification." });
  }
  const user = getUserById(userId);
  return buildTransactionHistoryResponse(user);
}

async function handleTransfer(queryResult) {
  const userId = queryResult.parameters?.fields?.userId?.stringValue;
  if (!userId) {
    return buildFulfillmentResponse({ speakableText: "I can't access account details without user identification." });
  }
  const amount = queryResult.parameters.fields.amount.structValue.fields.amount.numberValue;
  return buildTransferConfirmationResponse(amount, 'checking', 'savings');
}

async function handleDefault() {
  return buildFulfillmentResponse({
    speakableText: "I can help with account balances, transactions, and transfers. How can I assist?"
  });
}

const intentHandlers = {
  'account.balance': handleAccountBalance,
  'transaction.history': handleTransactionHistory,
  'account.transfer - yes': handleTransfer,
  'Default Fallback Intent': handleDefault
};

// --- Main Handler ---
const bankingWebhookHandler = async (req, res) => {
  const { queryResult } = req.body;
  if (!queryResult) {
    return res.status(400).json(createStandardResponse(false, null, "Invalid Dialogflow request."));
  }

  const intentName = queryResult.intent?.displayName;
  const handlerFn = intentHandlers[intentName] || handleDefault;
  
  const responseData = await handlerFn(queryResult);
  return res.status(200).json(responseData);
};

export default createApiHandler(bankingWebhookHandler, {
  allowedMethods: ['POST'],
});