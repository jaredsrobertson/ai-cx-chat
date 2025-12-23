// lib/services/orchestrator-service.ts
import { DialogflowService } from './dialogflow-service';

export const OrchestratorService = {
  routeRequest: async (text: string, sessionId: string, isAuthenticated: boolean) => {
    
    // Unified Routing: Send everything to Dialogflow.
    // Dialogflow will determine if the intent is Banking (Intent) or Support (Knowledge Base).
    const dfResult = await DialogflowService.detectIntent(text, sessionId, isAuthenticated);

    // Return a standardized response format for the API
    return {
      source: 'Dialogflow', 
      category: 'Unified', 
      text: dfResult.text,
      intent: dfResult.intent,
      confidence: dfResult.confidence,
      quickReplies: dfResult.quickReplies,
      payload: dfResult.payload,
      // Pass through authentication triggers if defined in Dialogflow
      actionRequired: dfResult.actionRequired,
      actionMessage: dfResult.actionMessage,
      // Pass through Knowledge Base citations if found
      sources: dfResult.sources 
    };
  }
};