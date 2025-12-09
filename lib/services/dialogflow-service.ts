import * as dialogflow from '@google-cloud/dialogflow';

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

    const request: dialogflow.protos.google.cloud.dialogflow.v2.IDetectIntentRequest = {
      session: sessionPath,
      queryInput: {
        text: {
          text: text,
          languageCode: 'en-US',
        },
      },
      queryParams: {}
    };

    // Inject Auth Context if user is logged in
    if (isAuthenticated && request.queryParams) {
      request.queryParams.contexts = [{
        name: `${sessionPath}/contexts/authenticated`,
        lifespanCount: 5,
        parameters: { fields: { authenticated: { boolValue: true } } },
      }];
    }

    const [response] = await sessionClient.detectIntent(request);
    const result = response.queryResult;

    // Parse Quick Replies
    let quickReplies: string[] = [];
    result?.fulfillmentMessages?.forEach(msg => {
      if (msg.quickReplies?.quickReplies) {
        quickReplies = msg.quickReplies.quickReplies;
      }
    });

    // Parse Payload (for custom actions like requiring auth)
    let payload: Record<string, any> | null = null;
    let actionRequired: string | undefined;
    let actionMessage: string | undefined;

    result?.fulfillmentMessages?.forEach(msg => {
      if (msg.payload && msg.payload.fields) {
        const fields = msg.payload.fields;
        payload = {};
        
        // Simple unwrap of proto structs
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

    return {
      text: result?.fulfillmentText || "I didn't catch that.",
      intent: result?.intent?.displayName || 'Unknown',
      confidence: result?.intentDetectionConfidence || 0,
      quickReplies,
      payload,
      actionRequired,
      actionMessage
    };
  }
};