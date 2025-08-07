import dialogflow from '@google-cloud/dialogflow';
import { logger } from './logger';

function createClient() {
  // Vercel GCP Integration (priority)
  if (process.env.GCP_PRIVATE_KEY) {
    logger.info("Using Vercel GCP Integration for Dialogflow");
    
    const projectId = process.env.GCP_PROJECT_ID;
    const client_email = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
    const private_key = process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    if (!projectId || !client_email || !private_key) {
      throw new Error("Vercel GCP Integration incomplete. Check environment variables.");
    }
    
    return new dialogflow.SessionsClient({
      projectId,
      credentials: { client_email, private_key },
    });
  }
  
  // Local development fallback
  if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    logger.info("Using local Dialogflow credentials");
    
    return new dialogflow.SessionsClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
  }
  
  throw new Error("No Dialogflow credentials configured");
}

export async function detectIntent(sessionId, queryText) {
  try {
    const sessionClient = createClient();
    const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    if (!projectId) {
      throw new Error("Project ID not configured");
    }
    
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
    
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: queryText,
          languageCode: 'en-US',
        },
      },
      queryParams: {
        // Enable webhook for all queries
        webhookHeaders: {
          'X-Session-Id': sessionId
        }
      }
    };
    
    logger.debug('Sending to Dialogflow', { 
      sessionId, 
      query: queryText.substring(0, 50),
      projectId 
    });
    
    const [response] = await sessionClient.detectIntent(request);
    
    logger.info('Dialogflow response', {
      intent: response.queryResult?.intent?.displayName,
      webhookUsed: response.queryResult?.webhookSource,
      fulfillmentText: response.queryResult?.fulfillmentText?.substring(0, 100)
    });
    
    return response.queryResult;
    
  } catch (error) {
    logger.error('Dialogflow error', error);
    
    // Return a fallback response instead of throwing
    return {
      intent: { displayName: 'Default Fallback Intent' },
      fulfillmentText: "I'm having trouble understanding. Could you rephrase that?",
      webhookSource: false
    };
  }
}