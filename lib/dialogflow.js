const dialogflow = require('@google-cloud/dialogflow');

class DialogflowService {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'ai-cx-chat-demo';
    this.sessionClient = new dialogflow.SessionsClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });

    // --- Refactored Intent Handler Map ---
    this.intentHandlers = {
      'Default Welcome Intent': this.handleWelcome,
      'account.balance': this.handleBalanceQuery,
      'account.transfer': this.handleTransferRequest,
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

  handleTransferRequest(params, userContext) {
    if (!userContext.user) return { text: "Please log in to make a transfer." };
    const amount = params.amount?.structValue?.fields?.amount?.numberValue;
    const fromAccount = params.source_account?.stringValue || 'checking';
    const toAccount = params.destination_account?.stringValue || 'savings';
    
    if (!amount) return { text: "I can help with that. How much would you like to transfer and between which accounts?" };
    
    return { text: `I can process a transfer of $${amount.toFixed(2)} from ${fromAccount} to ${toAccount}. Please confirm to proceed.` };
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