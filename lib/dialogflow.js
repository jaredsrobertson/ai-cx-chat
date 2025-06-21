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
        if (classifiedIntent && classifiedIntent !== 'None' && this.intentHandlers[classifiedIntent]) {
            intentName = classifiedIntent;
            const handler = this.intentHandlers[intentName];
            responsePayload = await handler.call(this, queryResult, userContext);
        } else {
            responsePayload = await this.handleFallback.call(this, queryResult, userContext);
        }
    } else {
        const handler = this.intentHandlers[intentName];
        if (handler) {
            responsePayload = await handler.call(this, queryResult, userContext);
        } else {
            console.warn(`No handler found for intent: "${intentName}". Using fallback.`);
            responsePayload = await this.handleFallback.call(this, queryResult, userContext);
        }
    }
    
    if (responsePayload) {
      responsePayload.intentName = intentName;
    }
    
    return responsePayload;
  }
  
  intentHandlers = {
    'Default Welcome Intent': this.handleWelcome,
    'Default Fallback Intent': this.handleFallback,
    'agent.handoff': this.handleAgentHandoff,
    'account.balance': this.handleBalanceQuery,
    'account.transfer': this.handleTransferRequest,
    'account.transfer - yes': this.handleTransferConfirmation,
    'account.transactions': this.handleTransactionHistory
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

  handleTransactionHistory(queryResult, userContext) {
    if (!userContext?.user) return { speakableText: "Please log in to view your transaction history." };
    const params = queryResult.parameters.fields;
    const accountType = params.account?.stringValue || 'checking';
    const account = userContext.user.accounts[accountType];
    if (!account) {
        return {
            speakableText: `I couldn't find a ${accountType} account for you, but here is an example of what recent transactions look like.`,
            confidentialData: {
                type: 'transaction_history',
                transactions: [
                    { description: 'Online Purchase', date: '2025-06-20', amount: -75.50 },
                    { description: 'Grocery Store', date: '2025-06-19', amount: -42.10 },
                    { description: 'Direct Deposit', date: '2025-06-15', amount: 1200.00 }
                ]
            }
        }
    };
    return {
      speakableText: `Here are the last 3 transactions for your ${accountType} account.`,
      confidentialData: {
        type: 'transaction_history',
        transactions: account.recent.slice(0, 3)
      }
    };
  }

  handleTransferRequest(queryResult, userContext) {
    const queryText = queryResult.queryText.toLowerCase().trim();
    const affirmativeWords = ['yes', 'yep', 'yeah', 'ok', 'okay', 'correct', 'confirm', 'do it', 'proceed'];
    if (affirmativeWords.includes(queryText)) {
        return this.handleTransferConfirmation(queryResult, userContext);
    }
      
    if (!userContext?.user) {
      return { speakableText: "I can help you transfer funds! Please log in first." };
    }
    const params = queryResult.parameters.fields;
    const amount = params.amount?.structValue?.fields?.amount?.numberValue;
    let fromAccount = params.source_account?.stringValue;
    let toAccount = params.destination_account?.stringValue;
    if (!fromAccount && toAccount) fromAccount = toAccount === 'checking' ? 'savings' : 'checking';
    if (!toAccount && fromAccount) toAccount = fromAccount === 'checking' ? 'savings' : 'checking';
    if (fromAccount === toAccount) {
      return { speakableText: "You can't transfer funds to the same account. Please specify a different destination account." };
    }
    if (amount === undefined || amount === null) {
      return { speakableText: `I can transfer funds from your ${fromAccount} account to your ${toAccount} account. How much would you like to transfer?` };
    }
    return { speakableText: `You got it. Just to confirm, you want to transfer $${amount} from ${fromAccount} to ${toAccount}. Is that correct?` };
  }

  handleTransferConfirmation(queryResult, userContext) {
    if (!userContext?.user) return { speakableText: "There was an error. Please try the transfer again." };

    let amount, fromAccount, toAccount;

    const transferContext = queryResult.outputContexts?.find(
      ctx => ctx.name.endsWith('/contexts/accounttransfer-followup')
    );

    if (transferContext?.parameters?.fields) {
      const contextParams = transferContext.parameters.fields;
      amount = contextParams.amount?.structValue?.fields?.amount?.numberValue;
      fromAccount = contextParams.source_account?.stringValue;
      toAccount = contextParams.destination_account?.stringValue;
    }

    if (amount === undefined || amount === null || !fromAccount || !toAccount) {
      console.error("Failed to extract transfer parameters from context.", JSON.stringify(queryResult.outputContexts, null, 2));
      return { speakableText: "I'm sorry, something went wrong and I couldn't complete the transfer. Please try again." };
    }

    return { 
      speakableText: "The transfer has been completed successfully.",
      confidentialData: {
        type: 'transfer_confirmation',
        details: {
          amount: parseFloat(amount),
          fromAccount,
          toAccount,
        }
      }
    };
  }
}

const dialogflowService = new DialogflowService();
export default dialogflowService;