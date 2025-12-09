import { NextRequest, NextResponse } from 'next/server';
import { DialogflowFulfillment } from '@/lib/services/dialogflow-fulfillment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryResult } = body;
    
    // Extract Request Data
    const intentName = queryResult.intent.displayName;
    const parameters = queryResult.parameters;
    const contexts = queryResult.outputContexts || [];

    // Delegate to Service
    const response = await DialogflowFulfillment.handleIntent(intentName, parameters, contexts);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ 
      fulfillmentText: 'I apologize, but I encountered a system error. Please try again later.' 
    });
  }
}