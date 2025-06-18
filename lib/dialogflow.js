const dialogflow = require('@google-cloud/dialogflow');

class DialogflowService {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'ai-cx-chat-demo';
    this.sessionClient = new dialogflow.SessionsClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });

    this.intentHandlers = {
      'Default Welcome Intent': this.handleWelcome,
      'account.balance': this.handleBalanceQuery,
      'account.transfer': this.handleTransferRequest,
      'account.transfer - yes': this.handleTransferConfirmation,
      'transaction.history': this.handleTransactionHistory,
      'branch.info': this.handleBranchInfo,
      'agent.handoff': this.handleAgentHandoff,
      'Default Fallback Intent': this.handleFallback,
    };
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
      const [response] = await this.sessionClient.detectIntent(request);
      
      return {
        queryText: response.queryResult.queryText,
        intentName: response.queryResult.intent?.displayName || 'Default Fallback Intent',
        fulfillmentText: response.queryResult.fulfillmentText,
        parameters: response.queryResult.parameters?.fields || {},
        confidence: response.queryResult.intentDetectionConfidence,
      };
    } catch (error) {
      console.error('Error detecting intent:', error);
      throw new Error('Failed to process query with Dialogflow');
    }
  }


  // --- Central handler that uses the map ---
  async handleBankingIntent(intentName, parameters, userContext) {
    const handler = this.intentHandlers[intentName] || this.handleFallback;
    return handler.call(this, parameters, userContext);
  }

  handleTransferConfirmation(params, userContext) {
    if (!userContext.user) return { text: "There was an error. Please try the transfer again." };
    // In a real app, you would perform the transfer here.
    // For the demo, we just confirm it's done.
    return { text: "The transfer has been completed successfully." };
  }

  // --- Individual Intent Handler Functions ---

  handleWelcome() {
    return { text: "Hello! I'm your SecureBank assistant. I can help check balances, transfer funds, view transaction history, or connect you with a live agent. How can I assist you today?" };
  }
  
  handleFallback() {
    return { text: "I'm sorry, I didn't understand that. I can help with account balances, transfers, transaction history, and branch hours. You can also ask to 'speak to an agent'." };
  }

  handleAgentHandoff() {
     return { text: "I understand. Let me connect you to a live agent." };
  }

  handleBranchInfo() {
    return { text: "Our branches are open Monday-Friday 9:00 AM - 5:00 PM, and Saturday 9:00 AM - 2:00 PM. We are closed on Sundays and major holidays." };
  }

  handleBalanceQuery(params, userContext) {
    if (!userContext.user) return { text: "For security, please log in to view your account balance." };
    const { accounts } = userContext.user;
    return { text: `Here are your current balances:\n• Checking: $${accounts.checking.balance.toLocaleString()}\n• Savings: $${accounts.savings.balance.toLocaleString()}` };
  }

  async handleTransferRequest(params, userContext) {
    if (!userContext.user) {
      return {
        text: "I can help you transfer funds! Please log in first.",
        requiresAuth: true
      };
    }

    const amount = params.amount?.structValue?.fields?.amount?.numberValue;

    let fromAccount = params.source_account?.stringValue;
    let toAccount = params.destination_account?.stringValue;
    
    if (fromAccount && !toAccount) {
      toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
    } else if (!fromAccount && toAccount) {
      fromAccount = toAccount === 'checking' ? 'savings' : 'checking';
    } else if (!fromAccount && !toAccount) {
      return {
        text: "I can help with that. Please tell me which accounts to transfer between.",
        requiresAuth: false
      };
    }

    if (fromAccount === toAccount) {
      return {
        text: `You can't transfer from ${fromAccount} to the same account. Please clarify the destination account.`,
        requiresAuth: false
      };
    }
    
    if (amount === undefined || amount === null) {
      return {
        text: `I can transfer funds from your ${fromAccount} account to your ${toAccount} account. How much would you like to transfer?`,
        requiresAuth: false
      };
    }
    
    return {
      text: `I can process a transfer of $${amount.toFixed(2)} from your ${fromAccount} account to your ${toAccount} account. Would you like me to proceed with this transfer?`,
      requiresAuth: false
    };
  }

  handleTransactionHistory(params, userContext) {
    if (!userContext.user) return { text: "Please log in to view your transaction history." };
    const accountType = params.account?.stringValue || 'checking';
    const account = userContext.user.accounts[accountType];
    
    if (!account) return { text: `I couldn't find a ${accountType} account for you.` };

    const transactions = account.recent.slice(0, 3).map(tx => 
      `• ${tx.date}: ${tx.description} - $${Math.abs(tx.amount).toFixed(2)}`
    ).join('\n');
    
    return { text: `Here are your last 3 transactions for your ${accountType} account:\n${transactions}` };
  }
}

const dialogflowService = new DialogflowService();
module.exports = dialogflowService;