import dialogflow from '@google-cloud/dialogflow';
import { logger } from './logger';

function createClient() {
  // Path 1: Vercel Environment (priority)
  // Checks for the unique key provided by the Vercel GCP Integration.
  if (process.env.GCP_PRIVATE_KEY) {
    logger.debug("Using Vercel GCP Integration credentials");

    const projectId = process.env.GCP_PROJECT_ID;
    const client_email = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
    // Vercel stores newlines as literal '\\n'. We must replace them with actual newlines.
    const private_key = process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n');

    if (!projectId || !client_email || !private_key) {
      const errorMessage = "Vercel GCP Integration credentials are incomplete. Please verify GCP_PROJECT_ID, GCP_SERVICE_ACCOUNT_EMAIL, and GCP_PRIVATE_KEY are set correctly in your Vercel project settings.";
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return new dialogflow.SessionsClient({
      projectId,
      credentials: { client_email, private_key },
    });
  }

  // Path 2: Local Development Environment
  // Falls back to the local .env file variables.
  logger.debug("Using local credentials from .env file");
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!projectId || !keyFilename) {
    const errorMessage = "Local credentials are not configured. Please ensure GOOGLE_CLOUD_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS are set in your .env.local file.";
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    return new dialogflow.SessionsClient({ projectId, keyFilename });
  } catch (clientError) {
    logger.error("FATAL: Failed to initialize Dialogflow client with local credentials.", clientError);
    throw new Error("Could not create Dialogflow client with local credentials. Ensure the path in GOOGLE_APPLICATION_CREDENTIALS is correct and the file is valid.");
  }
}

/**
 * Sends a query to the Dialogflow agent and returns the result.
 */
export async function detectIntent(sessionId, queryText) {
  // createClient will throw an error if not configured, so no need for a try/catch here.
  const sessionClient = createClient();

  // Use the correct project ID based on the environment.
  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: queryText,
        languageCode: 'en-US',
      },
    },
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