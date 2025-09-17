// lib/dialogflow-client.ts
import { v4 as uuidv4 } from 'uuid';

export interface DialogflowMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  quickReplies?: string[];
  payload?: Record<string, unknown>;
}

interface DialogflowPayloadField {
  kind: string;
  stringValue?: string;
  numberValue?: number;
  boolValue?: boolean;
}

export interface DialogflowFulfillmentMessage {
  platform?: string;
  text?: {
    text: string[];
  };
  quickReplies?: {
    quickReplies: string[];
  };
  payload?: {
    fields?: {
      [key: string]: DialogflowPayloadField;
    };
  };
}

export interface DialogflowResponse {
  responseId: string;
  queryResult: {
    queryText: string;
    fulfillmentText: string;
    fulfillmentMessages?: DialogflowFulfillmentMessage[];
    intent?: {
      name: string;
      displayName: string;
    };
    parameters?: Record<string, unknown>;
    outputContexts?: Array<{
      name: string;
      parameters?: Record<string, unknown>;
    }>;
  };
}

class DialogflowClient {
  private sessionId: string;
  private projectId: string;
  private accessToken?: string;

  constructor() {
    const stored = localStorage.getItem('dialogflow-session');
    this.sessionId = stored || uuidv4();
    if (!stored) {
      localStorage.setItem('dialogflow-session', this.sessionId);
    }
    
    this.projectId = process.env.NEXT_PUBLIC_DIALOGFLOW_PROJECT_ID || '';
  }

  async sendMessage(text: string, isAuthenticated: boolean = false, authContext: boolean = false): Promise<DialogflowResponse> {
    try {
      const response = await fetch('/api/dialogflow/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          sessionId: this.sessionId,
          isAuthenticated,
          authContext, // Pass the new flag to the API
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

  parseQuickReplies(fulfillmentMessages?: DialogflowFulfillmentMessage[]): string[] {
    if (!fulfillmentMessages) return [];
    
    for (const message of fulfillmentMessages) {
      if (message.quickReplies?.quickReplies) {
        return message.quickReplies.quickReplies;
      }
    }
    return [];
  }

  parsePayload(fulfillmentMessages?: DialogflowFulfillmentMessage[]): Record<string, unknown> | null {
    if (!fulfillmentMessages) return null;
    
    for (const message of fulfillmentMessages) {
      if (message.payload && message.payload.fields) {
        const formattedPayload: Record<string, unknown> = {};
        for (const key in message.payload.fields) {
          const field: DialogflowPayloadField = message.payload.fields[key];
          const valueKey = field.kind as keyof typeof field;
          if (valueKey && field[valueKey]) {
            formattedPayload[key] = field[valueKey];
          }
        }
        return formattedPayload;
      }
    }
    return null;
  }

  setAuthenticated(authenticated: boolean) {
    localStorage.setItem('dialogflow-authenticated', authenticated.toString());
  }

  isAuthenticated(): boolean {
    return localStorage.getItem('dialogflow-authenticated') === 'true';
  }

  clearSession() {
    this.sessionId = uuidv4();
    localStorage.setItem('dialogflow-session', this.sessionId);
    localStorage.removeItem('dialogflow-authenticated');
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

export default DialogflowClient;