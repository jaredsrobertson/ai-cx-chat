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

interface DialogflowMessage {
  text?: { text: string[] };
  quickReplies?: { quickReplies: string[] };
  payload?: {
    fields: Record<string, {
      stringValue?: string;
      boolValue?: boolean;
      numberValue?: number;
    }>;
  };
  platform?: string;
}

interface DialogflowQueryResult {
  fulfillmentText?: string;
  fulfillmentMessages?: DialogflowMessage[];
  intent?: { displayName: string };
  intentDetectionConfidence?: number;
  outputContexts?: Array<{
    name: string;
    lifespanCount?: number;
    parameters?: { fields: Record<string, any> };
  }>;
  knowledgeAnswers?: {
    answers: Array<{
      answer: string;
      source?: string;
      faqQuestion?: string;
      matchConfidence?: number;
    }>;
  };
}

function extractQuickReplies(messages: DialogflowMessage[]): string[] {
  for (const msg of messages) {
    if (msg.quickReplies?.quickReplies) {
      return msg.quickReplies.quickReplies;
    }
  }
  return [];
}

function extractResponseText(result: DialogflowQueryResult): string {
  if (result.fulfillmentText) {
    return result.fulfillmentText;
  }
  
  if (result.fulfillmentMessages) {
    for (const msg of result.fulfillmentMessages) {
      if (msg.text?.text && msg.text.text.length > 0) {
        return msg.text.text[0];
      }
    }
  }
  
  return "I didn't catch that.";
}

function parsePayload(messages: DialogflowMessage[]): {
  payload: Record<string, any> | null;
  actionRequired?: string;
  actionMessage?: string;
} {
  let payload: Record<string, any> | null = null;
  let actionRequired: string | undefined;
  let actionMessage: string | undefined;

  for (const msg of messages) {
    if (msg.payload?.fields) {
      const fields = msg.payload.fields;
      payload = {};
      
      for (const [key, value] of Object.entries(fields)) {
        if (value.stringValue !== undefined) {
          payload[key] = value.stringValue;
        } else if (value.boolValue !== undefined) {
          payload[key] = value.boolValue;
        } else if (value.numberValue !== undefined) {
          payload[key] = value.numberValue;
        }
      }

      if (payload.action) {
        actionRequired = payload.action as string;
        actionMessage = payload.message as string;
      }
    }
  }

  return { payload, actionRequired, actionMessage };
}

function extractKnowledgeBaseSources(result: DialogflowQueryResult): Array<{ 
  title: string; 
  uri: string; 
  excerpt: string 
}> {
  const sources: Array<{ title: string; uri: string; excerpt: string }> = [];
  
  if (result.knowledgeAnswers?.answers && result.knowledgeAnswers.answers.length > 0) {
    const answer = result.knowledgeAnswers.answers[0];
    sources.push({
      title: answer.source || 'Knowledge Base',
      uri: answer.faqQuestion || '#',
      excerpt: answer.answer || ''
    });
  }

  return sources;
}

export const DialogflowService = {
  detectIntent: async (
    text: string, 
    sessionId: string, 
    isAuthenticated: boolean
  ): Promise<DialogflowResult> => {
    const projectId = process.env.DIALOGFLOW_PROJECT_ID;
    if (!projectId) {
      throw new Error('DIALOGFLOW_PROJECT_ID is required');
    }

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
        
        payload: {
          fields: {
            isAuthenticated: { 
              boolValue: isAuthenticated 
            }
          }
        },
        
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

    const [dfResponse] = await sessionClient.detectIntent(request);
    const result = dfResponse.queryResult as DialogflowQueryResult;

    const quickReplies = result.fulfillmentMessages 
      ? extractQuickReplies(result.fulfillmentMessages)
      : [];

    const responseText = extractResponseText(result);

    const { payload, actionRequired, actionMessage } = result.fulfillmentMessages
      ? parsePayload(result.fulfillmentMessages)
      : { payload: null };

    const sources = extractKnowledgeBaseSources(result);

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