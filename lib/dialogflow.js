import dialogflow from '@google-cloud/dialogflow';
import { logger } from './logger';
import { Struct } from 'google-gax';

let sessionClient = null;
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

if (!projectId) {
  logger.error("FATAL: GOOGLE_CLOUD_PROJECT_ID must be set.");
} else {
  try {
    const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
    if (credentialsJson) {
      const credentials = JSON.parse(credentialsJson);
      sessionClient = new dialogflow.SessionsClient({ projectId, credentials });
    } else {
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (!credentialsPath) {
        throw new Error("Google credentials are not set. Please set GOOGLE_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS.");
      }
      sessionClient = new dialogflow.SessionsClient({ projectId, keyFilename: credentialsPath });
    }
  } catch (clientError) {
    logger.error("FATAL: Failed to initialize Dialogflow client.", clientError);
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
  if (!sessionClient) {
    logger.error("Dialogflow client not initialized, returning fallback.");
    throw new Error("Dialogflow client is not available.");
  }
  
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  
  const request = {
    session: sessionPath,
    queryInput: {
      text: { text: queryText, languageCode: 'en-US' },
    },
    // Pass the auth token to the webhook via queryParams.payload
    queryParams: {
      payload: Struct.fromJavaScript({
        token: authToken,
      }),
    },
  };

  try {
    const [response] = await sessionClient.detectIntent(request);
    return response.queryResult;
  } catch (error) {
    logger.error('Dialogflow detectIntent error:', error);
    throw error;
  }
}