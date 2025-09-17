// lib/dialogflow-client.ts
import { v4 as uuidv4 } from 'uuid';

export interface DialogflowMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  quickReplies?: string[];
  payload?: any;
}

export interface DialogflowResponse {
  responseId: string;
  queryResult: {
    queryText: string;
    fulfillmentText: string;
    fulfillmentMessages?: Array<any>;
    intent?: {
      name: string;
      displayName: string;
    };
    parameters?: any;
    outputContexts?: Array<any>;
  };
}

class DialogflowClient {
  private sessionId: string;
  private projectId: string;
  private accessToken?: string;

  constructor() {
    // Get or create session ID
    const stored = localStorage.getItem('dialogflow-session');
    this.sessionId = stored || uuidv4();
    if (!stored) {
      localStorage.setItem('dialogflow-session', this.sessionId);
    }
    
    // Project ID will be set from environment variable
    this.projectId = process.env.NEXT_PUBLIC_DIALOGFLOW_PROJECT_ID || '';
  }

  async sendMessage(text: string): Promise<DialogflowResponse> {
    try {
      const response = await fetch('/api/dialogflow/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          sessionId: this.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending message to Dialogflow:', error);
      throw error;
    }
  }

  // Parse quick replies from Dialogflow response
  parseQuickReplies(fulfillmentMessages?: Array<any>): string[] {
    if (!fulfillmentMessages) return [];
    
    for (const message of fulfillmentMessages) {
      if (message.quickReplies?.quickReplies) {
        return message.quickReplies.quickReplies;
      }
    }
    return [];
  }

  // Parse custom payload (for auth requirements, agent transfer, etc.)
  parsePayload(fulfillmentMessages?: Array<any>): any {
    if (!fulfillmentMessages) return null;
    
    for (const message of fulfillmentMessages) {
      if (message.payload) {
        return message.payload;
      }
    }
    return null;
  }

  // Set authenticated context
  setAuthenticated(authenticated: boolean) {
    localStorage.setItem('dialogflow-authenticated', authenticated.toString());
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return localStorage.getItem('dialogflow-authenticated') === 'true';
  }

  // Clear session
  clearSession() {
    this.sessionId = uuidv4();
    localStorage.setItem('dialogflow-session', this.sessionId);
    localStorage.removeItem('dialogflow-authenticated');
  }

  // Get session ID
  getSessionId(): string {
    return this.sessionId;
  }
}

export default DialogflowClient;