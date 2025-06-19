import dialogflow from '@google-cloud/dialogflow';

class DialogflowService {
  constructor() {
    this.sessionClient = null;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    // Check if the necessary environment variables are set
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS || !this.projectId) {
      console.error(
        "Dialogflow environment variables not set. Please set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS (as a file path) in your .env.local file. The 'SecureBank Concierge' will not be available."
      );
      return;
    }

    try {
      // When the credentials option is omitted, the client library will automatically
      // look for the GOOGLE_APPLICATION_CREDENTIALS environment variable and use it as a path.
      this.sessionClient = new dialogflow.SessionsClient();
    } catch (error) {
      console.error(
        "Failed to initialize Dialogflow SessionsClient. Ensure the path in GOOGLE_APPLICATION_CREDENTIALS is correct and points to a valid service account JSON file.",
        error
      );
    }
  }

  async detectIntent(sessionId, queryText, languageCode = 'en-US') {
    if (!this.sessionClient) {
      return {
        intentName: 'Default Fallback Intent',
        fulfillmentText: "I'm sorry, my banking services are currently unavailable due to a configuration issue."
      };
    }
    const sessionPath = this.sessionClient.projectAgentSessionPath(this.projectId, sessionId);
    const request = {
      session: sessionPath,
      queryInput: {
        text: { text: queryText, languageCode: languageCode },
      },
    };

    try {
      const [response] = await this.sessionClient.detectIntent(request);
      return {
        queryText: response.queryResult.queryText,
        intentName: response.queryResult.intent?.displayName || 'Default Fallback Intent',
        parameters: response.queryResult.parameters?.fields || {},
      };
    } catch (error) {
      console.error('Dialogflow detectIntent error:', error);
      throw error;
    }
  }

  async handleBankingIntent(intentName, params, userContext) {
    if (!this.sessionClient) {
      return { speakableText: "I'm sorry, my banking services are currently unavailable due to a configuration issue." };
    }
    const handler = this.intentHandlers[intentName] || this.handleFallback;
    return handler.call(this, params, userContext);
  }
  
  intentHandlers = {
    'Default Welcome Intent': this.handleWelcome,
    'Default Fallback Intent': this.handleFallback,
    'agent.handoff': this.handleAgentHandoff,
    'info.branch_hours': this.handleBranchInfo,
    'account.balance': this.handleBalanceQuery,
    'account.transfer': this.handleTransferRequest,
    'account.transfer - yes': this.handleTransferConfirmation,
    'account.transactions': this.handleTransactionHistory
  };

  handleWelcome() {
    return { speakableText: "Hello! I'm your SecureBank Concierge. I can help check balances, transfer funds, or view transaction history. How can I assist you today?" };
  }

  handleFallback() {
    return { speakableText: "I'm sorry, I didn't understand that. I can help with account balances, transfers, and transaction history." };
  }

  handleAgentHandoff() {
    return { speakableText: "I understand. Let me connect you to a live agent." };
  }

  handleBranchInfo() {
    return { speakableText: "Our branches are open Monday through Friday from 9 AM to 5 PM." };
  }

  handleBalanceQuery(params, userContext) {
    if (!userContext.user) return { speakableText: "For security, please log in to view your account balance." };
    const { accounts } = userContext.user;
    return {
      speakableText: "Of course. Here are your current account balances.",
      confidentialData: {
        type: 'balances',
        accounts: [
          { name: 'Checking', balance: accounts.checking.balance },
          { name: 'Savings', balance: accounts.savings.balance }
        ]
      }
    };
  }

  handleTransactionHistory(params, userContext) {
    if (!userContext.user) return { speakableText: "Please log in to view your transaction history." };
    const accountType = params.account?.stringValue || 'checking';
    const account = userContext.user.accounts[accountType];
    if (!account) return { speakableText: `I couldn't find a ${accountType} account for you.` };
    return {
      speakableText: `Here are the last 3 transactions for your ${accountType} account.`,
      confidentialData: {
        type: 'transaction_history',
        transactions: account.recent.slice(0, 3)
      }
    };
  }

  handleTransferRequest(params, userContext) {
    if (!userContext.user) {
      return { speakableText: "I can help you transfer funds! Please log in first." };
    }
    const amountValue = params.amount?.listValue?.values?.[0] || params.amount;
    const amount = amountValue?.structValue?.fields?.amount?.numberValue;
    const fromAccountValue = params.source_account?.listValue?.values?.[0] || params.source_account;
    let fromAccount = fromAccountValue?.stringValue;
    const toAccountValue = params.destination_account?.listValue?.values?.[0] || params.destination_account;
    let toAccount = toAccountValue?.stringValue;
    if (!fromAccount && toAccount) fromAccount = toAccount === 'checking' ? 'savings' : 'checking';
    if (!toAccount && fromAccount) toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
    if (fromAccount === toAccount) {
      return { speakableText: "You can't transfer funds to the same account. Please specify a different destination account." };
    }
    if (amount === undefined || amount === null) {
      return { speakableText: `I can transfer funds from your ${fromAccount} account to your ${toAccount} account. How much would you like to transfer?` };
    }
    return { speakableText: `I can process this transfer. Would you like me to proceed?` };
  }

  handleTransferConfirmation(params, userContext) {
    if (!userContext.user) return { speakableText: "There was an error. Please try the transfer again." };
    return { speakableText: "The transfer has been completed successfully. Your balances will update momentarily." };
  }
}

const dialogflowService = new DialogflowService();
export default dialogflowService;