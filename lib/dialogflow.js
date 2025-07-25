import dialogflow from '@google-cloud/dialogflow';
import { logger } from './logger';

// 🚨 FIX: Manual struct creation instead of GAX dependency
function createStructFromObject(obj) {
  const struct = {
    fields: {}
  };
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      struct.fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      struct.fields[key] = { numberValue: value };
    } else if (typeof value === 'boolean') {
      struct.fields[key] = { boolValue: value };
    } else if (value === null) {
      struct.fields[key] = { nullValue: 'NULL_VALUE' };
    } else if (typeof value === 'object') {
      struct.fields[key] = { structValue: createStructFromObject(value) };
    }
  }
  
  return struct;
}

function createClient() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

  if (!projectId) {
    logger.error("FATAL: GOOGLE_CLOUD_PROJECT_ID must be set.");
    throw new Error("Dialogflow project ID is not configured.");
  }

  try {
    // Prioritize JSON credentials (required for Vercel/serverless)
    const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
    if (credentialsJson) {
      logger.debug("Using GOOGLE_CREDENTIALS_JSON for authentication");
      const credentials = JSON.parse(credentialsJson);
      return new dialogflow.SessionsClient({ 
        projectId, 
        credentials 
      });
    }
    
    // Fallback to file path (only works in local development)
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialsPath) {
      logger.debug("Using GOOGLE_APPLICATION_CREDENTIALS file path for authentication");
      return new dialogflow.SessionsClient({ 
        projectId, 
        keyFilename: credentialsPath 
      });
    }
    
    // If neither is set, throw an error
    throw new Error("Google credentials are not set. Please set GOOGLE_CREDENTIALS_JSON (recommended for production) or GOOGLE_APPLICATION_CREDENTIALS.");
    
  } catch (clientError) {
    logger.error("FATAL: Failed to initialize Dialogflow client.", clientError);
    throw new Error("Could not create Dialogflow client: " + clientError.message);
  }
}

/**
 * Sends a query to the Dialogflow agent and returns the result.
 * @param {string} sessionId The unique session identifier.
 * @param {string} queryText The user's message.
 * @param {string} [authToken] An optional JWT for authenticated users.
 * @returns {Promise<object>} The queryResult from Dialogflow.
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
  
  const request = {
    session: sessionPath,
    queryInput: {
      text: { 
        text: queryText, 
        languageCode: 'en-US' 
      },
    },
  };

  // 🚨 FIX: Use manual struct creation instead of Struct.fromJavaScript
  if (authToken) {
    request.queryParams = {
      payload: createStructFromObject({
        token: authToken,
      }),
    };
  }

  try {
    logger.debug('Sending request to Dialogflow', { 
      sessionId, 
      queryText: queryText.substring(0, 50) + (queryText.length > 50 ? '...' : ''),
      hasAuthToken: !!authToken 
    });

    const [response] = await sessionClient.detectIntent(request);
    
    logger.debug('Dialogflow response received', { 
      intent: response.queryResult?.intent?.displayName,
      fulfillmentText: response.queryResult?.fulfillmentText?.substring(0, 100),
      hasWebhookResponse: !!response.queryResult?.fulfillmentMessages?.length,
      parametersCount: Object.keys(response.queryResult?.parameters?.fields || {}).length
    });

    return response.queryResult;
    
  } catch (error) {
    logger.error('Dialogflow detectIntent error:', error);
    
    // Provide more specific error messages
    if (error.code === 3) {
      throw new Error('Dialogflow request failed: Invalid request parameters');
    } else if (error.code === 7) {
      throw new Error('Dialogflow request failed: Permission denied - check credentials');
    } else if (error.code === 16) {
      throw new Error('Dialogflow request failed: Authentication required');
    } else {
      throw new Error(`Dialogflow request failed: ${error.message}`);
    }
  }
}