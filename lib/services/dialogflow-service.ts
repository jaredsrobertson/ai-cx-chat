// lib/services/dialogflow-service.ts
import { v4 as uuidv4 } from 'uuid';

// 1. CHANGE: Use require to explicitly get v2beta1 (which supports Knowledge Bases)
const dialogflow = require('@google-cloud/dialogflow').v2beta1;

const sessionClient = new dialogflow.SessionsClient({
  projectId: process.env.DIALOGFLOW_PROJECT_ID,
  credentials: {
    client_email: process.env.DIALOGFLOW_CLIENT_EMAIL,
    private_key: process.env.DIALOGFLOW_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

export interface DialogflowResult {
  text: string;
  intent: string;
  confidence: number;
  quickReplies: string[];
  payload: Record<string, any> | null;
  actionRequired?: string;
  actionMessage?: string;
  sources?: { title: string; uri: string; excerpt: string }[];
}

export const DialogflowService = {
  detectIntent: async (
    text: string, 
    sessionId: string, 
    isAuthenticated: boolean
  ): Promise<DialogflowResult> => {
    const projectId = process.env.DIALOGFLOW_PROJECT_ID;
    if (!projectId) throw new Error('Dialogflow Config Missing');

    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    // 2. CHANGE: Remove the strict 'v2' type definition that was causing errors
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: text,
          languageCode: 'en-US',
        },
      },
      queryParams: {
        // 3. CHANGE: Add your Knowledge Base ID here
        // Replace with your actual ID, e.g., 'projects/my-project/knowledgeBases/MTIz...'
        knowledgeBaseNames: [`projects/${projectId}/knowledgeBases/MjEzOTkxODQ2ODg3MjE5MjAwMA`],
        
        // Inject Auth Context if user is logged in
        ...(isAuthenticated && {
          contexts: [{
            name: `${sessionPath}/contexts/authenticated`,
            lifespanCount: 5,
            parameters: { fields: { authenticated: { boolValue: true } } },
          }]
        })
      }
    };

    // 4. CHANGE: detectIntent returns an array [response]
    const [response] = await sessionClient.detectIntent(request);
    const result = response.queryResult;

    // Parse Quick Replies
    let quickReplies: string[] = [];
    if (result.fulfillmentMessages) {
      result.fulfillmentMessages.forEach((msg: any) => {
        if (msg.quickReplies?.quickReplies) {
          quickReplies = msg.quickReplies.quickReplies;
        }
      });
    }

    // Parse Payload
    let payload: Record<string, any> | null = null;
    let actionRequired: string | undefined;
    let actionMessage: string | undefined;

    if (result.fulfillmentMessages) {
      result.fulfillmentMessages.forEach((msg: any) => {
        if (msg.payload && msg.payload.fields) {
          const fields = msg.payload.fields;
          payload = {};
          
          Object.keys(fields).forEach(key => {
            const val = fields[key];
            if (val.stringValue) payload![key] = val.stringValue;
            if (val.boolValue !== undefined) payload![key] = val.boolValue;
          });

          if (payload.action) {
            actionRequired = payload.action;
            actionMessage = payload.message;
          }
        }
      });
    }

    // 5. CHANGE: Parse Knowledge Base Answers
    // We use (result as any) because 'knowledgeAnswers' is missing from some V2 definitions
    const sources: { title: string; uri: string; excerpt: string }[] = [];
    
    if ((result as any).knowledgeAnswers && (result as any).knowledgeAnswers.answers) {
        (result as any).knowledgeAnswers.answers.forEach((answer: any) => {
            sources.push({
                title: 'Knowledge Base',
                uri: answer.faqQuestion || '#',
                excerpt: answer.answer || ''
            });
        });
    }

    return {
      text: result.fulfillmentText || "I didn't catch that.",
      intent: result.intent?.displayName || 'Unknown',
      confidence: result.intentDetectionConfidence || 0,
      quickReplies,
      payload,
      actionRequired,
      actionMessage,
      sources
    };
  }
};