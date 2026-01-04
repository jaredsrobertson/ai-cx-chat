import { v4 as uuidv4 } from 'uuid';

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

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: text,
          languageCode: 'en-US',
        },
      },
      queryParams: {
        knowledgeBaseNames: [`projects/${projectId}/knowledgeBases/MjA1ODA2NTU4OTk5MzIwOTg1Nw`],
        
        // Pass auth as payload parameter (more reliable than context alone)
        payload: {
          fields: {
            isAuthenticated: { 
              boolValue: isAuthenticated 
            }
          }
        },
        
        // Also inject auth context for backward compatibility
        ...(isAuthenticated && {
          contexts: [{
            name: `${sessionPath}/contexts/authenticated`,
            lifespanCount: 5,
            parameters: { 
              fields: { 
                authenticated: { boolValue: true } 
              } 
            },
          }]
        })
      }
    };

    const [response] = await sessionClient.detectIntent(request);
    const result = response.queryResult;

    // Parse quick replies from fulfillment messages
    let quickReplies: string[] = [];
    if (result.fulfillmentMessages) {
      result.fulfillmentMessages.forEach((msg: any) => {
        if (msg.quickReplies?.quickReplies) {
          quickReplies = msg.quickReplies.quickReplies;
        }
      });
    }

    // Extract text from fulfillmentText or first text message
    let responseText = result.fulfillmentText || '';
    if (!responseText && result.fulfillmentMessages) {
      for (const msg of result.fulfillmentMessages) {
        if (msg.text?.text && msg.text.text.length > 0) {
          responseText = msg.text.text[0];
          break;
        }
      }
    }
    if (!responseText) {
      responseText = "I didn't catch that.";
    }

    // Parse payload for special actions
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

    // Parse Knowledge Base answers (if present)
    const sources: { title: string; uri: string; excerpt: string }[] = [];
    if ((result as any).knowledgeAnswers?.answers) {
      const answers = (result as any).knowledgeAnswers.answers;
      if (answers.length > 0) {
        sources.push({
          title: answers[0].source || 'Knowledge Base',
          uri: answers[0].faqQuestion || '#',
          excerpt: answers[0].answer || ''
        });
      }
    }

    return {
      text: responseText,
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