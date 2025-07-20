import { createApiHandler, createStandardResponse } from '@/lib/apiUtils';
import { logger } from '@/lib/logger';
import { mockUsers } from '@/lib/mockData';

// --- Helper Functions ---
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// --- Intent Handlers for Webhook ---

function handleReminder() {
  return {
    fulfillmentMessages: [{
      text: { text: ["I can help with account balances, transaction history, and fund transfers. You can also ask to speak with a live agent. What would you like to do?"] }
    }]
  };
}

function handleAgentHandoff() {
  return {
    fulfillmentMessages: [{
      payload: {
        fields: {
          speakableText: { stringValue: "I understand. Let me connect you to a live agent." },
          action: { stringValue: 'AGENT_HANDOFF' }
        }
      }
    }]
  };
}

function handleBalanceQuery(parameters, user) {
  if (!user) {
    return { fulfillmentMessages: [{ payload: { fields: { action: { stringValue: 'AUTH_REQUIRED' }, intentName: { stringValue: 'account.balance' } } } }] };
  }

  const requestedAccount = parameters?.account?.stringValue;
  const { accounts } = user;

  if (requestedAccount && accounts[requestedAccount]) {
    return {
      fulfillmentMessages: [{
        payload: {
          fields: {
            speakableText: { stringValue: `Your ${requestedAccount} account balance is ${formatCurrency(accounts[requestedAccount].balance)}.` },
            confidentialData: { structValue: { fields: {
              type: { stringValue: 'balances' },
              accounts: { listValue: { values: [{ structValue: { fields: { name: { stringValue: requestedAccount }, balance: { numberValue: accounts[requestedAccount].balance } } } }] } }
            }}}
          }
        }
      }]
    };
  } else {
    return {
      fulfillmentMessages: [{
        payload: {
          fields: {
            speakableText: { stringValue: "Here are your current account balances." },
            confidentialData: { structValue: { fields: {
              type: { stringValue: 'balances' },
              accounts: { listValue: { values: [
                { structValue: { fields: { name: { stringValue: 'Checking' }, balance: { numberValue: accounts.checking.balance } } } },
                { structValue: { fields: { name: { stringValue: 'Savings' }, balance: { numberValue: accounts.savings.balance } } } }
              ]}}
            }}}
          }
        }
      }]
    };
  }
}

function handleTransactionHistory(parameters, user) {
  if (!user) {
    return { fulfillmentMessages: [{ payload: { fields: { action: { stringValue: 'AUTH_REQUIRED' }, intentName: { stringValue: 'transaction.history' } } } }] };
  }
  
  const account = user.accounts.checking;
  
  return {
    fulfillmentMessages: [{
      payload: {
        fields: {
          speakableText: { stringValue: `Here are your recent transactions.` },
          confidentialData: { structValue: { fields: {
            type: { stringValue: 'transaction_history' },
            transactions: { listValue: { values: account.recent.slice(0, 3).map(tx => ({
              structValue: { fields: {
                date: { stringValue: tx.date },
                description: { stringValue: tx.description },
                amount: { numberValue: tx.amount }
              }}
            }))}}
          }}}
        }
      }
    }]
  };
}

function handleTransferRequest(parameters, user) {
  if (!user) {
    return { fulfillmentMessages: [{ payload: { fields: { action: { stringValue: 'AUTH_REQUIRED' }, intentName: { stringValue: 'account.transfer' } } } }] };
  }

  const amount = parameters.amount?.structValue?.fields?.amount?.numberValue;
  let fromAccount = parameters.source_account?.stringValue;
  let toAccount = parameters.destination_account?.stringValue;

  if (!amount) {
    return { fulfillmentMessages: [{ text: { text: ["I can help you transfer funds. Please tell me the amount and which accounts you'd like to transfer between."] } }] };
  }

  // Auto-determine missing account
  if (fromAccount && !toAccount) toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
  else if (!fromAccount && toAccount) fromAccount = toAccount === 'checking' ? 'savings' : 'checking';

  if (!fromAccount || !toAccount) {
    return { fulfillmentMessages: [{ text: { text: ["Which account would you like to transfer from, and to which account?"] } }] };
  }
  
  if (fromAccount === toAccount) {
    return { fulfillmentMessages: [{ text: { text: ["You can't transfer funds to the same account. Please specify a different destination account."] } }] };
  }

  return {
    fulfillmentMessages: [{ text: { text: [`You got it. Just to confirm, you want to transfer ${formatCurrency(amount)} from ${fromAccount} to ${toAccount}. Is that correct?`] } }],
    outputContexts: [{
      name: `awaiting_transfer_confirmation`,
      lifespanCount: 1,
      parameters: { amount, source_account: fromAccount, destination_account: toAccount }
    }]
  };
}

function handleTransferConfirmation(outputContexts, user) {
  if (!user) {
    return { fulfillmentMessages: [{ text: { text: ["There was an error. Please try the transfer again."] } }] };
  }

  const transferContext = outputContexts.find(ctx => ctx.name.endsWith('accounttransfer-followup'));
  const params = transferContext?.parameters?.fields;
  
  const amount = params?.amount?.structValue?.fields?.amount?.numberValue;
  const fromAccount = params?.source_account?.stringValue;
  const toAccount = params?.destination_account?.stringValue;

  if (amount && fromAccount && toAccount) {
    return {
      fulfillmentMessages: [{
        payload: {
          fields: {
            speakableText: { stringValue: "The transfer has been completed successfully." },
            confidentialData: { structValue: { fields: {
              type: { stringValue: 'transfer_confirmation' },
              details: { structValue: { fields: {
                amount: { numberValue: amount },
                fromAccount: { stringValue: fromAccount },
                toAccount: { stringValue: toAccount }
              }}}
            }}}
          }
        }
      }]
    };
  }

  return { fulfillmentMessages: [{ text: { text: ["I'm sorry, something went wrong and I couldn't complete the transfer. Please try again."] } }] };
}


const intentHandlers = {
  'Default Welcome Intent': handleReminder,
  'Default Fallback Intent': handleReminder,
  'agent.handoff': handleAgentHandoff,
  'account.balance': handleBalanceQuery,
  'transaction.history': handleTransactionHistory,
  'account.transfer': handleTransferRequest,
  'account.transfer - yes': handleTransferConfirmation,
};

const bankingWebhookHandler = async (req, res, user) => {
  const { queryResult } = req.body;
  const intentName = queryResult.intent.displayName;
  const handler = intentHandlers[intentName];
  
  logger.debug('Webhook request received', { intent: intentName, authenticated: !!user });

  if (handler) {
    const responseData = await handler(queryResult.parameters?.fields, user, queryResult.outputContexts);
    return res.status(200).json(responseData);
  } else {
    logger.warn(`No webhook handler found for intent: "${intentName}". Using fallback.`);
    return res.status(200).json(handleReminder());
  }
};

export default createApiHandler(bankingWebhookHandler, {
  allowedMethods: ['POST'],
});
