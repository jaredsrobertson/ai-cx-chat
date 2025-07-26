import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';
import { mockUsers } from '@/lib/mockData';
import { getSessionToken } from '@/lib/dialogflow';

// Helper Functions
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

function buildAuthRequiredResponse(intentName) {
  return buildFulfillmentResponse({
    action: 'AUTH_REQUIRED',
    intentName: intentName,
    authMessage: "Please log in to view your account information."
  });
}

function buildBalanceResponse(user) {
  const speakableText = `Here are your current account balances.`;
  
  return {
    fulfillmentText: speakableText,
    fulfillmentMessages: [
      {
        payload: {
          fields: {
            speakableText: {
              stringValue: speakableText
            },
            confidentialData: {
              structValue: {
                fields: {
                  type: {
                    stringValue: "balances"
                  },
                  accounts: {
                    listValue: {
                      values: [
                        {
                          structValue: {
                            fields: {
                              name: { stringValue: "Checking" },
                              balance: { numberValue: user.accounts.checking.balance }
                            }
                          }
                        },
                        {
                          structValue: {
                            fields: {
                              name: { stringValue: "Savings" },
                              balance: { numberValue: user.accounts.savings.balance }
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]
  };
}

function buildTransactionHistoryResponse(user) {
  const speakableText = "Here are your recent transactions from your checking account.";
  
  return {
    fulfillmentText: speakableText,
    fulfillmentMessages: [
      {
        payload: {
          fields: {
            speakableText: {
              stringValue: speakableText
            },
            confidentialData: {
              structValue: {
                fields: {
                  type: {
                    stringValue: "transaction_history"
                  },
                  transactions: {
                    listValue: {
                      values: user.accounts.checking.recent.slice(0, 5).map(tx => ({
                        structValue: {
                          fields: {
                            date: { stringValue: tx.date },
                            description: { stringValue: tx.description },
                            amount: { numberValue: tx.amount }
                          }
                        }
                      }))
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]
  };
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
  const speakableText = `Transfer completed!`;
  
  return {
    fulfillmentText: speakableText,
    fulfillmentMessages: [
      {
        payload: {
          fields: {
            speakableText: {
              stringValue: speakableText
            },
            confidentialData: {
              structValue: {
                fields: {
                  type: {
                    stringValue: "transfer_confirmation"
                  },
                  details: {
                    structValue: {
                      fields: {
                        amount: { numberValue: amount },
                        fromAccount: { stringValue: source },
                        toAccount: { stringValue: destination }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]
  };
}

function getUserFromToken(token) {
  if (!token) return null;
  
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user && user.userId) {
      const fullUser = mockUsers[user.userId];
      if (fullUser) {
        const { pin, ...userData } = fullUser;
        return userData;
      }
    }
  } catch (error) {
    logger.error('JWT verification failed', { error: error.message });
  }
  
  return null;
}

// Intent Handlers
async function handleAccountBalance(sessionId) {
  const token = getSessionToken(sessionId);
  const user = getUserFromToken(token);
  
  if (!user) {
    logger.info('Balance request without valid auth - returning AUTH_REQUIRED');
    return buildAuthRequiredResponse('account.balance');
  }
  
  logger.info('Authenticated balance request', { userId: user.id, userName: user.name });
  return buildBalanceResponse(user);
}

async function handleTransactionHistory(sessionId) {
  const token = getSessionToken(sessionId);
  const user = getUserFromToken(token);
  
  if (!user) {
    return buildAuthRequiredResponse('transaction.history');
  }
  
  logger.info('Authenticated transaction history request', { userId: user.id });
  return buildTransactionHistoryResponse(user);
}

async function handleAccountTransfer(sessionId, parameters, session) {
  const token = getSessionToken(sessionId);
  const user = getUserFromToken(token);
  
  if (!user) {
    return buildAuthRequiredResponse('account.transfer');
  }
  
  // Extract parameters
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
  
  if (!user.accounts[source]) {
    return buildFulfillmentResponse(null, `I couldn't find your ${source} account. Please check the account name.`);
  }
  
  if (!user.accounts[destination]) {
    return buildFulfillmentResponse(null, `I couldn't find your ${destination} account. Please check the account name.`);
  }
  
  if (amount > user.accounts[source].balance) {
    return buildFulfillmentResponse(null, `Insufficient funds. Your ${source} account balance is ${formatCurrency(user.accounts[source].balance)}.`);
  }

  return buildTransferConfirmationResponse(amount, source, destination, session);
}

async function handleTransferConfirmation(sessionId, outputContexts) {
  const token = getSessionToken(sessionId);
  const user = getUserFromToken(token);
  
  if (!user) {
    return buildFulfillmentResponse(null, "Your session expired. Please start the transfer again.");
  }
  
  const transferContext = outputContexts?.find(ctx => 
    ctx.name.includes('awaiting_transfer_confirmation') || 
    ctx.name.includes('accounttransfer-followup')
  );
  
  if (!transferContext || !transferContext.parameters) {
    return buildFulfillmentResponse(null, "I couldn't find the transfer details. Please start the transfer process again.");
  }

  const { amount, source_account, destination_account } = transferContext.parameters;
  
  if (!amount || !source_account || !destination_account) {
    return buildFulfillmentResponse(null, "Transfer details are incomplete. Please start over with a new transfer request.");
  }

  logger.info('Transfer completed', { 
    userId: user.id, 
    amount, 
    source: source_account, 
    destination: destination_account 
  });
  
  return buildTransferCompletionResponse(amount, source_account, destination_account);
}

async function handleAgentHandoff() {
  const speakableText = "I'm connecting you with a live agent who can provide personalized assistance. Please hold on.";
  return buildFulfillmentResponse({ action: 'AGENT_HANDOFF' }, speakableText);
}

async function handleDefault() {
  const speakableText = "I can help you check balances, view transactions, transfer funds, or connect you with a live agent. What would you like to do?";
  return buildFulfillmentResponse(null, speakableText);
}

async function handleGreeting(sessionId) {
  const token = getSessionToken(sessionId);
  const user = getUserFromToken(token);
  const userName = user ? user.name.split(' ')[0] : '';
  const speakableText = user 
    ? `Hello ${userName}! I'm your CloudBank assistant. I can help you check balances, view transactions, transfer funds, or connect you with a live agent. How can I assist you today?`
    : "Welcome to CloudBank! I can help you with your banking needs. Please note that you'll need to log in to access account-specific information. How can I assist you today?";
  
  return buildFulfillmentResponse(null, speakableText);
}

// Intent handler mapping
const intentHandlers = {
  'account.balance': handleAccountBalance,
  'transaction.history': handleTransactionHistory,
  'account.transfer': handleAccountTransfer,
  'account.transfer - yes': handleTransferConfirmation,
  'agent.handoff': handleAgentHandoff,
  'Default Welcome Intent': handleGreeting,
  'Default Fallback Intent': handleDefault
};

// Main Handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { queryResult, session } = req.body;
    
    const sessionId = session ? session.split('/').pop() : null;
    
    if (!queryResult || !sessionId) {
      return res.status(400).json({ 
        fulfillmentText: "I'm having trouble processing your request. Please try again." 
      });
    }

    const intentName = queryResult.intent?.displayName;
    const authRequiredIntents = ['account.balance', 'account.transfer', 'account.transfer - yes', 'transaction.history'];
    
    logger.debug('Processing intent:', { intentName, sessionId });

    let responseData;
    
    if (intentName === 'account.balance') {
      responseData = await handleAccountBalance(sessionId);
    } else if (intentName === 'transaction.history') {
      responseData = await handleTransactionHistory(sessionId);
    } else if (intentName === 'account.transfer') {
      responseData = await handleAccountTransfer(sessionId, queryResult.parameters, session);
    } else if (intentName === 'account.transfer - yes') {
      responseData = await handleTransferConfirmation(sessionId, queryResult.outputContexts);
    } else if (intentName === 'agent.handoff') {
      responseData = await handleAgentHandoff();
    } else if (intentName === 'Default Welcome Intent') {
      responseData = await handleGreeting(sessionId);
    } else {
      responseData = await handleDefault();
    }
    
    logger.debug('Webhook response:', {
      intent: intentName,
      hasConfidentialData: !!responseData.fulfillmentMessages?.[0]?.payload?.fields?.confidentialData,
      fulfillmentText: responseData.fulfillmentText?.substring(0, 50)
    });
    
    return res.status(200).json(responseData);

  } catch (error) {
    logger.error('Webhook error:', error);
    return res.status(500).json({ 
      fulfillmentText: "I'm experiencing technical difficulties. Please try again in a moment." 
    });
  }
}