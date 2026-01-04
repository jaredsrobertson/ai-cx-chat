// lib/services/orchestrator-service.ts
import { DialogflowService } from './dialogflow-service';

// Standard Quick Replies - matches the ones in dialogflow-fulfillment.ts
const STANDARD_QRB = [
  { display: '🕒 Hours', payload: 'What are your hours?' },
  { display: '📍 Locations', payload: 'Where are you located?' },
  { display: '🔢 Routing Number', payload: 'What is my routing number?' },
  { display: '💬 Contact', payload: 'What is your contact number?' },
  { display: '💰 Check Balance', payload: 'Check my balance' },
  { display: '💸 Transfer Funds', payload: 'Transfer funds' },
  { display: '📋 Transaction History', payload: 'Show my transaction history' },
  { display: '👤 Chat with Agent', payload: 'Chat with agent' }
];

export const OrchestratorService = {
  routeRequest: async (text: string, sessionId: string, isAuthenticated: boolean) => {
    
    // Send everything to Dialogflow
    // Dialogflow will determine if it's Banking (Intent) or Support (Knowledge Base)
    const dfResult = await DialogflowService.detectIntent(text, sessionId, isAuthenticated);

    // If response has no quick replies (KB response), add standard QRBs
    const quickReplies = dfResult.quickReplies && dfResult.quickReplies.length > 0 
      ? dfResult.quickReplies 
      : STANDARD_QRB;

    // Return a standardized response format for the API
    return {
      source: 'Dialogflow', 
      category: 'Unified', 
      text: dfResult.text,
      intent: dfResult.intent,
      confidence: dfResult.confidence,
      quickReplies: quickReplies,
      payload: dfResult.payload,
      // Pass through authentication triggers if defined in Dialogflow
      actionRequired: dfResult.actionRequired,
      actionMessage: dfResult.actionMessage,
      // Pass through Knowledge Base citations if found
      sources: dfResult.sources 
    };
  }
};