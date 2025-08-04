import { logger } from '@/lib/logger';
import { mockUsers, getUserById } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';
import { createApiHandler, createStandardResponse } from '@/lib/apiUtils';

// This file no longer needs to build a complex Dialogflow response,
// as it will now return simple JSON directly to our main API.
function buildBalanceResponse(user) {
  const speakableText = `Here are your current account balances. Your checking account has ${formatCurrency(user.accounts.checking.balance)} and your savings account has ${formatCurrency(user.accounts.savings.balance)}.`;
  return {
    speakableText,
    confidentialData: {
      type: "balances",
      accounts: [
        { name: "Checking", balance: user.accounts.checking.balance },
        { name: "Savings", balance: user.accounts.savings.balance }
      ]
    }
  };
}

function buildTransactionHistoryResponse(user) {
    const speakableText = "Here are your most recent transactions from your checking account.";
    return {
        speakableText,
        confidentialData: {
            type: "transaction_history",
            transactions: user.accounts.checking.recent,
        },
    };
}

function buildTransferConfirmationResponse(amount, fromAccount, toAccount) {
    const speakableText = `The transfer of ${formatCurrency(amount)} has been completed successfully.`;
    return {
        speakableText,
        confidentialData: {
            type: "transfer_confirmation",
            details: {
                amount,
                fromAccount,
                toAccount,
            },
        },
    };
}

// --- Intent Handlers ---
// The handlers now take the 'user' object directly from the authenticated session.
async function handleAccountBalance(user, queryResult) {
  return buildBalanceResponse(user);
}

async function handleTransactionHistory(user, queryResult) {
  return buildTransactionHistoryResponse(user);
}

async function handleTransfer(user, queryResult) {
  const amount = queryResult.parameters.fields.amount.structValue.fields.amount.numberValue;
  return buildTransferConfirmationResponse(amount, 'checking', 'savings');
}

async function handleDefault() {
  return {
    speakableText: "I can help with account balances, transactions, and transfers. How can I assist?"
  };
}

const intentHandlers = {
  'account.balance': handleAccountBalance,
  'transaction.history': handleTransactionHistory,
  'account.transfer - yes': handleTransfer,
  'Default Fallback Intent': handleDefault
};

// --- Main Handler ---
// The handler now receives the 'user' object from the createApiHandler wrapper.
const bankingWebhookHandler = async (req, res, user) => {
  const { queryResult } = req.body.dialogflowRequest; // The original request is now nested.
  
  if (!queryResult) {
    return res.status(400).json(createStandardResponse(false, null, "Invalid Dialogflow request."));
  }

  const intentName = queryResult.intent?.displayName;
  const handlerFn = intentHandlers[intentName] || handleDefault;
  
  // Pass the authenticated user object to the correct handler.
  const responseData = await handlerFn(user, queryResult);
  return res.status(200).json(createStandardResponse(true, responseData));
};

// Wrap the handler to enforce authentication.
export default createApiHandler(bankingWebhookHandler, {
  allowedMethods: ['POST'],
  requireAuth: true,
});