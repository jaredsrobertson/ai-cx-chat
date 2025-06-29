import dialogflow from '@google-cloud/dialogflow';
import { OpenAIService } from './openai';
import fs from 'fs';
import path from 'path';

class DialogflowService {
  constructor() {
    this.sessionClient = null;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.openaiService = new OpenAIService();
    const credentialsEnvVar = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!credentialsEnvVar || !this.projectId) {
      console.error(
        "FATAL ERROR: GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT_ID environment variables must be set."
      );
      return;
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsEnvVar);
    } catch (e) {
      try {
        const credentialsPath = path.resolve(credentialsEnvVar);
        const credentialsFileContent = fs.readFileSync(credentialsPath, 'utf8');
        credentials = JSON.parse(credentialsFileContent);
      } catch (fileError) {
        console.error(
          "FATAL ERROR: GOOGLE_APPLICATION_CREDENTIALS is not a valid JSON string nor a valid file path.",
          fileError
        );
        return;
      }
    }

    try {
      const config = {
        projectId: this.projectId,
        credentials,
      };
      this.sessionClient = new dialogflow.SessionsClient(config);
    } catch (clientError) {
      console.error("FATAL ERROR: Failed to initialize Dialogflow client.", clientError);
    }
  }

  async detectIntent(sessionId, queryText, languageCode = 'en-US') {
    if (!this.sessionClient) {
      return {
        intent: { displayName: 'Default Fallback Intent' },
        fulfillmentText: "I'm sorry, my banking services are currently unavailable due to a configuration issue.",
        queryText: queryText
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
      return response.queryResult;
    } catch (error) {
      console.error('Dialogflow detectIntent error:', error);
      throw error;
    }
  }

  async handleBankingIntent(queryResult, userContext) {
    let intentName = queryResult.intent?.displayName || 'Default Fallback Intent';
    let responsePayload;

    if (intentName === 'Default Fallback Intent') {
      const classifiedIntent = await this.openaiService.classifyIntent(queryResult.queryText);
      if (classifiedIntent && classifiedIntent !== 'None') {
        console.log(`Dialogflow failed, but OpenAI classified as: ${classifiedIntent}`);
        intentName = classifiedIntent;
      }
    }
    
    const handler = this.intentHandlers[intentName];
    
    if (handler) {
      responsePayload = await handler.call(this, queryResult, userContext);
    } else {
      console.warn(`No handler found for intent: "${intentName}". Using fallback.`);
      responsePayload = await this.handleFallback.call(this, queryResult, userContext);
    }
    
    responsePayload.intentName = intentName;
    return responsePayload;
  }
  
  intentHandlers = {
    'Default Welcome Intent': this.handleWelcome,
    'Default Fallback Intent': this.handleFallback,
    'agent.handoff': this.handleAgentHandoff,
    'account.balance': this.handleBalanceQuery,
    'account.transfer': this.handleTransferRequest,
    'account.transfer - yes': this.handleTransferConfirmation,
    'transaction.history': this.handleTransactionHistory
  };

  handleWelcome() {
    return { speakableText: "Welcome to the SecureBank Concierge. I can help you with account balances, transaction history, and fund transfers. You can also ask to speak with a live agent." };
  }

  handleFallback() {
    return { speakableText: "I'm sorry, I didn't quite understand. I can help with account balances, transaction history, and fund transfers. You can also ask to speak with a live agent." };
  }

  handleAgentHandoff() {
    return { speakableText: "I understand. Let me connect you to a live agent." };
  }

  handleBalanceQuery(queryResult, userContext) {
    if (!userContext?.user) return { speakableText: "For security, please log in to view your account balance." };
    
    const params = queryResult.parameters?.fields || {};
    const requestedAccount = params.account?.stringValue;
    
    const { accounts } = userContext.user;
    
    if (requestedAccount && accounts[requestedAccount]) {
      return {
        speakableText: `Your ${requestedAccount} account balance is ${this.formatCurrency(accounts[requestedAccount].balance)}.`,
        confidentialData: {
          type: 'balances',
          accounts: [{ name: requestedAccount, balance: accounts[requestedAccount].balance }]
        }
      };
    } else {
      return {
        speakableText: "Here are your current account balances.",
        confidentialData: {
          type: 'balances',
          accounts: [
            { name: 'Checking', balance: accounts.checking.balance },
            { name: 'Savings', balance: accounts.savings.balance }
          ]
        }
      };
    }
  }

  handleTransactionHistory(queryResult, userContext) {
    if (!userContext?.user) return { speakableText: "Please log in to view your transaction history." };
    
    const account = userContext.user.accounts.checking;
    
    return {
      speakableText: `Here are your recent transactions.`,
      confidentialData: {
        type: 'transaction_history',
        transactions: account.recent.slice(0, 3)
      }
    };
  }

  handleTransferRequest(queryResult, userContext) {
    if (!userContext?.user) {
        return { speakableText: "I can help with that. Please log in to transfer funds securely." };
    }

    const params = queryResult.parameters?.fields || {};
    const amount = params.amount?.structValue?.fields?.amount?.numberValue;
    let fromAccount = params.source_account?.stringValue;
    let toAccount = params.destination_account?.stringValue;

    if (!amount) {
        return { speakableText: "I can help you transfer funds. Please tell me the amount and which accounts you'd like to transfer between."};
    }

    if (fromAccount && !toAccount) {
        toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
    } else if (!fromAccount && toAccount) {
        fromAccount = toAccount === 'checking' ? 'savings' : 'checking';
    }

    if (!fromAccount || !toAccount) {
        return { speakableText: "Which account would you like to transfer from, and to which account?" };
    }
    
    if (fromAccount === toAccount) {
        return { speakableText: "You can't transfer funds to the same account. Please specify a different destination account." };
    }

    queryResult.parameters.fields.source_account = { stringValue: fromAccount, kind: 'stringValue' };
    queryResult.parameters.fields.destination_account = { stringValue: toAccount, kind: 'stringValue' };

    return { 
      speakableText: `You got it. Just to confirm, you want to transfer ${this.formatCurrency(amount)} from ${fromAccount} to ${toAccount}. Is that correct?`
    };
  }

  handleTransferConfirmation(queryResult, userContext) {
    if (!userContext?.user) return { speakableText: "There was an error. Please try the transfer again." };

    const transferContext = queryResult.outputContexts?.find(
      ctx => ctx.name.includes('accounttransfer-followup')
    );

    if (transferContext?.parameters?.fields) {
      const contextParams = transferContext.parameters.fields;
      const amount = contextParams.amount?.structValue?.fields?.amount?.numberValue;
      let fromAccount = contextParams.source_account?.stringValue;
      let toAccount = contextParams.destination_account?.stringValue;
      
      if (!toAccount && fromAccount) {
        toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
      }
      
      if (!fromAccount && toAccount) {
        fromAccount = toAccount === 'checking' ? 'savings' : 'checking';
      }
      
      console.log('Final transfer confirmation params:', { amount, fromAccount, toAccount });

      if (amount && fromAccount && toAccount) {
        return { 
          speakableText: "The transfer has been completed successfully.",
          confidentialData: {
            type: 'transfer_confirmation',
            details: { amount: parseFloat(amount), fromAccount, toAccount }
          }
        };
      }
    }

    console.error("Failed to extract transfer parameters from context.", JSON.stringify(queryResult.outputContexts, null, 2));
    return { speakableText: "I'm sorry, something went wrong and I couldn't complete the transfer. Please try again." };
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}

const dialogflowService = new DialogflowService();
export default dialogflowService;