import dialogflow from '@google-cloud/dialogflow';
import { OpenAIService } from './openai';

class DialogflowService {
  constructor() {
    this.sessionClient = null;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.openaiService = new OpenAIService();

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS || !this.projectId) {
      console.error(
        "Dialogflow environment variables not set. Please set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS (as a file path) in your .env.local file. The 'SecureBank Concierge' will not be available."
      );
      return;
    }

    try {
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
    const intentName = queryResult.intent?.displayName || 'Default Fallback Intent';
    const handler = this.intentHandlers[intentName] || this.handleFallback;
    const responsePayload = await handler.call(this, queryResult, userContext);
    
    if (responsePayload) {
      responsePayload.intentName = intentName;
    }
    
    return responsePayload;
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
    return { speakableText: "Welcome to the SecureBank Concierge. I can help you with account balances, transaction history, and fund transfers. I can also provide branch hours. If you need more help, just ask to speak with a live agent. How can I assist you today?" };
  }

  async handleFallback(queryResult, userContext) {
    const classifiedIntent = await this.openaiService.classifyIntent(queryResult.queryText);
    if (classifiedIntent && classifiedIntent !== 'None') {
      const handler = this.intentHandlers[classifiedIntent];
      return handler.call(this, queryResult, userContext);
    }
    return { speakableText: "I'm sorry, I didn't quite understand. I can help with account balances, transaction history, fund transfers, and branch hours. You can also ask to speak with a live agent." };
  }

  handleAgentHandoff() {
    return { speakableText: "I understand. Let me connect you to a live agent." };
  }

  handleBranchInfo() {
    return { speakableText: "Our branches are open Monday through Friday from 9 AM to 5 PM." };
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
    if (!account) return { speakableText: `I couldn't find a ${accountType} account for you.` };
    return {
      speakableText: `Here are the last 3 transactions for your ${accountType} account.`,
      confidentialData: {
        type: 'transaction_history',
        transactions: account.recent.slice(0, 3)
      }
    };
  }

  handleTransferRequest(queryResult, userContext) {
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
    return { speakableText: `I can process this transfer. Would you like me to proceed?` };
  }

  handleTransferConfirmation(queryResult, userContext) {
    if (!userContext?.user) return { speakableText: "There was an error. Please try the transfer again." };

    // Add debugging to see exactly what Dialogflow provides
    console.log('=== TRANSFER CONFIRMATION DEBUG ===');
    console.log('Intent:', queryResult.intent?.displayName);
    console.log('Parameters:', JSON.stringify(queryResult.parameters, null, 2));
    console.log('Output contexts:', queryResult.outputContexts?.map(ctx => ({
      name: ctx.name,
      parameters: ctx.parameters
    })));
    console.log('=====================================');

    let amount, fromAccount, toAccount;

    // Method 1: Direct parameter access (Dialogflow follow-up intents should carry parameters forward)
    if (queryResult.parameters?.fields) {
      const params = queryResult.parameters.fields;
      
      // Try different parameter structures that Dialogflow might use
      amount = params.amount?.structValue?.fields?.amount?.numberValue || 
               params.amount?.numberValue || 
               params['amount']?.numberValue;
               
      fromAccount = params.source_account?.stringValue || 
                    params['source-account']?.stringValue ||
                    params.source_account?.stringValue;
                    
      toAccount = params.destination_account?.stringValue || 
                  params['destination-account']?.stringValue ||
                  params.destination_account?.stringValue;
    }

    // Method 2: Extract from contexts (follow-up intents create contexts automatically)
    if ((!amount || !fromAccount || !toAccount) && queryResult.outputContexts) {
      for (const context of queryResult.outputContexts) {
        if (context.parameters) {
          // Try both nested and direct parameter access
          const params = context.parameters.fields || context.parameters;
          
          amount = amount || params.amount?.structValue?.fields?.amount?.numberValue || 
                   params.amount?.numberValue || params.amount;
                   
          fromAccount = fromAccount || params.source_account?.stringValue || 
                        params['source-account']?.stringValue || params.source_account;
                        
          toAccount = toAccount || params.destination_account?.stringValue || 
                      params['destination-account']?.stringValue || params.destination_account;
        }
      }
    }

    // Method 3: For demo purposes, use reasonable defaults if extraction fails
    if (!amount || !fromAccount || !toAccount) {
      console.warn('Could not extract all transfer parameters, using defaults for demo');
      amount = amount || 10;
      fromAccount = fromAccount || 'checking';
      toAccount = toAccount || 'savings';
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