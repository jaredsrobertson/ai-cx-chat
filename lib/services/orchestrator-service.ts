// lib/services/orchestrator-service.ts
import { DialogflowService } from './dialogflow-service';

// Standard Quick Replies - custom format for frontend (no emojis)
const STANDARD_QRB = [
  { display: 'Hours', payload: 'What are your hours?' },
  { display: 'Locations', payload: 'Where are you located?' },
  { display: 'Routing Number', payload: 'What is your routing number?' },
  { display: 'Contact Support', payload: 'How do I contact support?' },
  { display: 'Check Balance', payload: 'Check my balance' },
  { display: 'Transfer Funds', payload: 'Transfer funds' },
  { display: 'Transaction History', payload: 'Show my transaction history' },
  { display: 'Talk to Agent', payload: 'Talk to agent' }
];

// Mapping from simple display text to custom QRB object
const QRB_MAP: Record<string, { display: string; payload: string }> = {
  'Hours': { display: 'Hours', payload: 'What are your hours?' },
  'Locations': { display: 'Locations', payload: 'Where are you located?' },
  'Routing Number': { display: 'Routing Number', payload: 'What is your routing number?' },
  'Contact Support': { display: 'Contact Support', payload: 'How do I contact support?' },
  'Check Balance': { display: 'Check Balance', payload: 'Check my balance' },
  'Transfer Funds': { display: 'Transfer Funds', payload: 'Transfer funds' },
  'Transaction History': { display: 'Transaction History', payload: 'Show my transaction history' },
  'Talk to Agent': { display: 'Talk to Agent', payload: 'Talk to agent' }
};

// Convert simple string QRBs from Dialogflow to custom format for frontend
function convertToCustomQRBs(simpleQRBs: any[]): any[] {
  return simpleQRBs.map(qrb => {
    // If already custom format, return as-is
    if (typeof qrb === 'object' && qrb.display && qrb.payload) {
      return qrb;
    }
    // If simple string, convert to custom
    if (typeof qrb === 'string') {
      return QRB_MAP[qrb] || { display: qrb, payload: qrb };
    }
    return qrb;
  });
}

export const OrchestratorService = {
  routeRequest: async (text: string, sessionId: string, isAuthenticated: boolean) => {
    
    // Send everything to Dialogflow
    const dfResult = await DialogflowService.detectIntent(text, sessionId, isAuthenticated);

    console.log('Dialogflow result:', {
      text: dfResult.text?.substring(0, 100),
      intent: dfResult.intent,
      hasText: !!dfResult.text,
      hasQRBs: !!dfResult.quickReplies,
      qrbCount: dfResult.quickReplies?.length
    });

    // Convert Dialogflow's simple QRBs to custom format, or use standard if none provided
    let quickReplies;
    if (dfResult.quickReplies && dfResult.quickReplies.length > 0) {
      quickReplies = convertToCustomQRBs(dfResult.quickReplies);
    } else {
      quickReplies = STANDARD_QRB;
    }

    // Return a standardized response format for the API
    return {
      source: 'Dialogflow', 
      category: 'Unified', 
      text: dfResult.text,
      intent: dfResult.intent,
      confidence: dfResult.confidence,
      quickReplies: quickReplies,
      payload: dfResult.payload,
      actionRequired: dfResult.actionRequired,
      actionMessage: dfResult.actionMessage,
      sources: dfResult.sources 
    };
  }
};