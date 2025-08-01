import dialogflow from '@google-cloud/dialogflow';
import { logger } from './logger';

function createClient() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

  if (!projectId) {
    logger.error("FATAL: GOOGLE_CLOUD_PROJECT_ID must be set.");
    throw new Error("Dialogflow project ID is not configured.");
  }

  try {
    const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
    if (credentialsJson) {
      logger.debug("Using GOOGLE_CREDENTIALS_JSON for authentication");
      const credentials = JSON.parse(credentialsJson);
      return new dialogflow.SessionsClient({ 
        projectId, 
        credentials 
      });
    }
    
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialsPath) {
      logger.debug("Using GOOGLE_APPLICATION_CREDENTIALS file path for authentication");
      return new dialogflow.SessionsClient({ 
        projectId, 
        keyFilename: credentialsPath 
      });
    }
    
    throw new Error("Google credentials are not set. Please set GOOGLE_CREDENTIALS_JSON (recommended for production) or GOOGLE_APPLICATION_CREDENTIALS.");
    
  } catch (clientError) {
    logger.error("FATAL: Failed to initialize Dialogflow client.", clientError);
    throw new Error("Could not create Dialogflow client: " + clientError.message);
  }
}

/**
 * Sends a query to the Dialogflow agent and returns the result.
 */
export async function detectIntent(sessionId, queryText, sessionParams = null) {
  let sessionClient;
  
  try {
    sessionClient = createClient();
  } catch (error) {
    logger.error('Failed to create Dialogflow client:', error);
    throw new Error('Dialogflow service is not properly configured.');
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  
  const request = {
    session: sessionPath,
    queryInput: {
      text: { 
        text: queryText, 
        languageCode: 'en-US' 
      },
    },
    ...(sessionParams && { queryParams: { payload: sessionParams } })
  };

  try {
    logger.debug('Sending request to Dialogflow', { 
      sessionId, 
      queryText: queryText.substring(0, 50) + (queryText.length > 50 ? '...' : ''),
    });

    const [response] = await sessionClient.detectIntent(request);
    
    logger.debug('Dialogflow response received', { 
      intent: response.queryResult?.intent?.displayName,
      fulfillmentText: response.queryResult?.fulfillmentText?.substring(0, 100),
    });

    return response.queryResult;
    
  } catch (error) {
    logger.error('Dialogflow detectIntent error:', error);
    throw new Error(`Dialogflow request failed: ${error.message}`);
  }
}