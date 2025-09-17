// app/api/dialogflow/detect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as dialogflow from '@google-cloud/dialogflow';

// Initialize Dialogflow client
const sessionClient = new dialogflow.SessionsClient({
  projectId: process.env.DIALOGFLOW_PROJECT_ID,
  credentials: {
    client_email: process.env.DIALOGFLOW_CLIENT_EMAIL,
    private_key: process.env.DIALOGFLOW_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

export async function POST(request: NextRequest) {
  try {
    const { text, sessionId } = await request.json();

    if (!text || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: text and sessionId' },
        { status: 400 }
      );
    }

    const projectId = process.env.DIALOGFLOW_PROJECT_ID;
    if (!projectId) {
      console.error('DIALOGFLOW_PROJECT_ID not configured');
      return NextResponse.json(
        { error: 'Dialogflow not configured properly' },
        { status: 500 }
      );
    }

    // Create session path
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    // Create detect intent request
    const detectRequest = {
      session: sessionPath,
      queryInput: {
        text: {
          text: text,
          languageCode: 'en-US',
        },
      },
    };

    // Detect intent
    const [response] = await sessionClient.detectIntent(detectRequest);

    // Check if we have a webhook response
    const queryResult = response.queryResult;
    
    // If webhook was used, the fulfillment messages will be in webhookPayload
    // Otherwise, they'll be in fulfillmentMessages
    
    return NextResponse.json({
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
    console.error('Error detecting intent:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}