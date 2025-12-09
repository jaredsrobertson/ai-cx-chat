import { NextRequest } from 'next/server';
import * as dialogflow from '@google-cloud/dialogflow';
import { errorResponse, successResponse } from '@/lib/api-utils';

const sessionClient = new dialogflow.SessionsClient({
  projectId: process.env.DIALOGFLOW_PROJECT_ID,
  credentials: {
    client_email: process.env.DIALOGFLOW_CLIENT_EMAIL,
    private_key: process.env.DIALOGFLOW_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

export async function POST(request: NextRequest) {
  try {
    const { text, event, sessionId, authContext } = await request.json();

    if ((!text && !event) || !sessionId) {
      return errorResponse('Missing required fields', 400);
    }

    const projectId = process.env.DIALOGFLOW_PROJECT_ID;
    if (!projectId) return errorResponse('Configuration error', 500);

    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    // Construct request based on text vs event
    const queryInput: dialogflow.protos.google.cloud.dialogflow.v2.IQueryInput = event 
      ? { event: { name: event, languageCode: 'en-US' } }
      : { text: { text: text, languageCode: 'en-US' } };

    const detectRequest: dialogflow.protos.google.cloud.dialogflow.v2.IDetectIntentRequest = {
      session: sessionPath,
      queryInput,
      queryParams: {},
    };
    
    // Inject auth context if needed (e.g. after login)
    if (authContext && detectRequest.queryParams) {
      detectRequest.queryParams.contexts = [{
        name: `${sessionPath}/contexts/authenticated`,
        lifespanCount: 25,
        parameters: { fields: { authenticated: { boolValue: true } } },
      }];
    }
    
    const [response] = await sessionClient.detectIntent(detectRequest);
    const queryResult = response.queryResult;
    
    return successResponse({
      responseId: response.responseId,
      queryResult: {
        queryText: queryResult?.queryText || '',
        fulfillmentText: queryResult?.fulfillmentText || '',
        fulfillmentMessages: queryResult?.fulfillmentMessages || [],
        intent: queryResult?.intent ? {
          name: queryResult.intent.name || '',
          displayName: queryResult.intent.displayName || '',
        } : undefined,
        parameters: queryResult?.parameters?.fields || {},
        outputContexts: queryResult?.outputContexts || [],
      },
    });

  } catch (error) {
    console.error('Dialogflow Detect Error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}