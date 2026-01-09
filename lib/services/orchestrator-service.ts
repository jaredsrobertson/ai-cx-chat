// lib/services/orchestrator-service.ts
import { DialogflowService } from './dialogflow-service';
import { STANDARD_QUICK_REPLIES, QUICK_REPLY_MAP } from '@/lib/chat-constants';

// Convert simple string QRBs from Dialogflow to custom format for frontend
function convertToCustomQRBs(simpleQRBs: any[]): any[] {
  return simpleQRBs.map(qrb => {
    // If already custom format, return as-is
    if (typeof qrb === 'object' && qrb.display && qrb.payload) {
      return qrb;
    }
    // If simple string, convert to custom using the centralized MAP
    if (typeof qrb === 'string') {
      return QUICK_REPLY_MAP[qrb] || { display: qrb, payload: qrb };
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
      // Use the centralized STANDARD list as fallback
      quickReplies = STANDARD_QUICK_REPLIES;
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