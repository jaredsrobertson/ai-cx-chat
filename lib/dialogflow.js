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

// Simple in-memory session storage (use Redis in production)
const sessionTokens = new Map();

/**
 * Store JWT token for a session
 */
export function storeSessionToken(sessionId, token) {
  sessionTokens.set(sessionId, {
    token,
    timestamp: Date.now()
  });
  
  // Clean up old tokens (older than 1 hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [id, data] of sessionTokens.entries()) {
    if (data.timestamp < oneHourAgo) {
      sessionTokens.delete(id);
    }
  }
}

/**
 * Get JWT token for a session
 */
export function getSessionToken(sessionId) {
  const data = sessionTokens.get(sessionId);
  if (!data) return null;
  
  // Check if token is less than 1 hour old
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  if (data.timestamp < oneHourAgo) {
    sessionTokens.delete(sessionId);
    return null;
  }
  
  return data.token;
}

/**
 * Sends a query to the Dialogflow agent and returns the result.
 */
export async function detectIntent(sessionId, queryText, authToken = null) {
  let sessionClient;
  
  try {
    sessionClient = createClient();
  } catch (error) {
    logger.error('Failed to create Dialogflow client:', error);
    throw new Error('Dialogflow service is not properly configured.');
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  
  // Store the token in session if provided
  if (authToken) {
    storeSessionToken(sessionId, authToken);
    logger.debug('Token stored in session', { sessionId, hasToken: true });
  }
  
  const request = {
    session: sessionPath,
    queryInput: {
      text: { 
        text: queryText, 
        languageCode: 'en-US' 
      },
    },
  };

  try {
    logger.debug('Sending request to Dialogflow', { 
      sessionId, 
      queryText: queryText.substring(0, 50) + (queryText.length > 50 ? '...' : ''),
      hasStoredToken: !!getSessionToken(sessionId)
    });

    const [response] = await sessionClient.detectIntent(request);
    
    logger.debug('Dialogflow response received', { 
      intent: response.queryResult?.intent?.displayName,
      fulfillmentText: response.queryResult?.fulfillmentText?.substring(0, 100),
      hasWebhookResponse: !!response.queryResult?.fulfillmentMessages?.length,
      webhookCalled: !!response.queryResult?.diagnosticInfo?.fields?.webhook_latency_ms
    });

    return response.queryResult;
    
  } catch (error) {
    logger.error('Dialogflow detectIntent error:', error);
    throw new Error(`Dialogflow request failed: ${error.message}`);
  }
}