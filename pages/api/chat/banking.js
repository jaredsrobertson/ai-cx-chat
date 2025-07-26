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
  const speakableText = `Here are your current account balances. Your checking account has ${formatCurrency(user.accounts.checking.balance)} and your savings account has ${formatCurrency(user.accounts.savings.balance)}.`;
  
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
  // Get token from session storage
  const token = getSessionToken(sessionId);
  const user = getUserFromToken(token);
  
  if (!user) {
    logger.info('Balance request without valid auth - returning AUTH_REQUIRED');
    return buildAuthRequiredResponse('account.balance');
  }
  
  logger.info('Authenticated balance request', { userId: user.id, userName: user.name });
  return buildBalanceResponse(user);
}

async function handleDefault() {
  const speakableText = "I can help you check balances, view transactions, transfer funds, or connect you with a live agent. What would you like to do?";
  return buildFulfillmentResponse(null, speakableText);
}

// Intent handler mapping
const intentHandlers = {
  'account.balance': handleAccountBalance,
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
    
    logger.debug('=== WEBHOOK SESSION-BASED DEBUG ===');
    logger.debug('Intent:', queryResult?.intent?.displayName);
    logger.debug('Session:', session);
    
    // Extract session ID from session path
    const sessionId = session ? session.split('/').pop() : null;
    logger.debug('Session ID:', sessionId);
    
    if (!queryResult || !sessionId) {
      return res.status(400).json({ 
        fulfillmentText: "I'm having trouble processing your request. Please try again." 
      });
    }

    const intentName = queryResult.intent?.displayName;
    
    if (intentName === 'account.balance') {
      const responseData = await handleAccountBalance(sessionId);
      
      logger.debug('Webhook response:', {
        intent: intentName,
        hasConfidentialData: !!responseData.fulfillmentMessages?.[0]?.payload?.fields?.confidentialData,
        fulfillmentText: responseData.fulfillmentText?.substring(0, 50)
      });
      
      return res.status(200).json(responseData);
    }

    const handlerFn = intentHandlers[intentName] || handleDefault;
    const responseData = await handlerFn();
    return res.status(200).json(responseData);

  } catch (error) {
    logger.error('Webhook error:', error);
    return res.status(500).json({ 
      fulfillmentText: "I'm experiencing technical difficulties. Please try again in a moment." 
    });
  }
}