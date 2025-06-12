const dialogflow = require('@google-cloud/dialogflow');

class DialogflowService {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'ai-cx-chat-demo';
    this.sessionClient = null;
    this.init();
  }

  async init() {
    try {
      // Initialize the Dialogflow session client
      this.sessionClient = new dialogflow.SessionsClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });
    } catch (error) {
      console.error('Failed to initialize Dialogflow:', error);
    }
  }

  async detectIntent(sessionId, queryText, languageCode = 'en-US') {
    if (!this.sessionClient) {
      throw new Error('Dialogflow client not initialized');
    }

    const sessionPath = this.sessionClient.projectAgentSessionPath(
      this.projectId,
      sessionId
    );

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: queryText,
          languageCode: languageCode,
        },
      },
    };

    try {
      // Send request to Dialogflow
      const [response] = await this.sessionClient.detectIntent(request);
      
      return {
        queryText: response.queryResult.queryText,
        intentName: response.queryResult.intent?.displayName || 'Default Fallback Intent',
        fulfillmentText: response.queryResult.fulfillmentText,
        parameters: response.queryResult.parameters?.fields || {},
        confidence: response.queryResult.intentDetectionConfidence,
        action: response.queryResult.action,
        contexts: response.queryResult.outputContexts || [],
        webhookPayload: response.queryResult.webhookPayload
      };
    } catch (error) {
      console.error('Error detecting intent:', error);
      throw new Error('Failed to process query with Dialogflow');
    }
  }

  // Helper method to extract parameter values
  extractParameters(parameters) {
    const extracted = {};
    for (const [key, value] of Object.entries(parameters)) {
      if (value.stringValue) {
        extracted[key] = value.stringValue;
      } else if (value.numberValue) {
        extracted[key] = value.numberValue;
      } else if (value.boolValue !== undefined) {
        extracted[key] = value.boolValue;
      }
    }
    return extracted;
  }

  // Banking intent handlers
  async handleBankingIntent(intentName, parameters, userContext) {
    const params = this.extractParameters(parameters);
    
    switch (intentName) {
      case 'account.balance':
        return this.handleBalanceQuery(params, userContext);
      
      case 'account.transfer':
        return this.handleTransferRequest(params, userContext);
      
      case 'account.history':
        return this.handleTransactionHistory(params, userContext);
      
      case 'account.payment':
        return this.handlePaymentRequest(params, userContext);
      
      case 'branch.hours':
        return this.handleBranchHours(params);
      
      case 'account.help':
        return this.handleGeneralHelp(params);
      
      default:
        return {
          text: "I understand you're asking about banking services. Could you please be more specific about what you'd like to help with?",
          requiresAuth: false
        };
    }
  }

  async handleBalanceQuery(params, userContext) {
    if (!userContext.user) {
      return {
        text: "I'd be happy to check your account balance! For security purposes, please log in to access your account information.",
        requiresAuth: true
      };
    }

    const { accounts } = userContext.user;
    const accountType = params.accountType || 'checking';
    
    if (accountType === 'all' || !params.accountType) {
      return {
        text: `Here are your current balances:\n• Checking: $${accounts.checking.balance.toLocaleString()}\n• Savings: $${accounts.savings.balance.toLocaleString()}`,
        requiresAuth: false
      };
    }

    const account = accounts[accountType];
    if (account) {
      return {
        text: `Your ${accountType} account balance is $${account.balance.toLocaleString()}.`,
        requiresAuth: false
      };
    }

    return {
      text: `I couldn't find a ${accountType} account. You have checking and savings accounts available.`,
      requiresAuth: false
    };
  }

  async handleTransferRequest(params, userContext) {
    if (!userContext.user) {
      return {
        text: "I can help you transfer funds between your accounts! Please log in first to access this service.",
        requiresAuth: true
      };
    }

    const amount = params.amount || params['unit-currency']?.amount;
    const fromAccount = params.fromAccount || 'checking';
    const toAccount = params.toAccount || 'savings';

    if (!amount) {
      return {
        text: "I can help you transfer funds. How much would you like to transfer and between which accounts?",
        requiresAuth: false
      };
    }

    return {
      text: `I can help you transfer $${amount} from your ${fromAccount} to your ${toAccount} account. Would you like me to proceed with this transfer?`,
      requiresAuth: false,
      suggestedActions: ['Confirm Transfer', 'Cancel', 'Change Amount']
    };
  }

  async handleTransactionHistory(params, userContext) {
    if (!userContext.user) {
      return {
        text: "I can show you your recent transactions! Please log in to view your account history.",
        requiresAuth: true
      };
    }

    const accountType = params.accountType || 'checking';
    const account = userContext.user.accounts[accountType];
    
    if (!account) {
      return {
        text: `I couldn't find a ${accountType} account. Would you like to see your checking or savings transactions?`,
        requiresAuth: false
      };
    }

    const recentTransactions = account.recent.slice(0, 3);
    let response = `Here are your recent ${accountType} transactions:\n\n`;
    
    recentTransactions.forEach(tx => {
      const sign = tx.amount > 0 ? '+' : '';
      response += `• ${tx.date}: ${tx.description} ${sign}$${tx.amount.toLocaleString()}\n`;
    });

    return {
      text: response,
      requiresAuth: false
    };
  }

  async handlePaymentRequest(params, userContext) {
    if (!userContext.user) {
      return {
        text: "I can help you make payments! Please log in to access your payment options.",
        requiresAuth: true
      };
    }

    const payee = params.payee;
    const amount = params.amount || params['unit-currency']?.amount;

    if (!payee && !amount) {
      return {
        text: "I can help you make a payment. Who would you like to pay and for how much?",
        requiresAuth: false
      };
    }

    if (payee && amount) {
      return {
        text: `I can set up a payment of $${amount} to ${payee}. Would you like me to process this payment?`,
        requiresAuth: false,
        suggestedActions: ['Confirm Payment', 'Cancel', 'Schedule Later']
      };
    }

    return {
      text: `I can help you make payments. Please specify the amount and payee.`,
      requiresAuth: false
    };
  }

  async handleBranchHours(params) {
    const location = params.location;
    
    if (location) {
      return {
        text: `Our ${location} branch is open Monday-Friday 9:00 AM - 5:00 PM, Saturday 9:00 AM - 2:00 PM. We're closed on Sundays and major holidays.`,
        requiresAuth: false
      };
    }

    return {
      text: "Our branches are typically open Monday-Friday 9:00 AM - 5:00 PM, Saturday 9:00 AM - 2:00 PM. Would you like information about a specific location?",
      requiresAuth: false
    };
  }

  async handleGeneralHelp(params) {
    return {
      text: "I'm here to help with your banking needs! I can assist you with:\n• Account balances and transactions\n• Fund transfers between accounts\n• Bill payments and scheduling\n• Branch locations and hours\n• General banking questions\n\nWhat would you like help with today?",
      requiresAuth: false
    };
  }
}

// Export singleton instance
const dialogflowService = new DialogflowService();
module.exports = dialogflowService;