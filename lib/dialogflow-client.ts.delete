import { v4 as uuidv4 } from 'uuid';

interface DialogflowPayloadField {
  kind: string;
  stringValue?: string;
  numberValue?: number;
  boolValue?: boolean;
}

export interface DialogflowFulfillmentMessage {
  platform?: string;
  text?: { text: string[] };
  quickReplies?: { quickReplies: string[] };
  payload?: { fields?: { [key: string]: DialogflowPayloadField } };
}

export interface DialogflowResponse {
  responseId: string;
  queryResult: {
    queryText: string;
    fulfillmentText: string;
    fulfillmentMessages?: DialogflowFulfillmentMessage[];
    intent?: { name: string; displayName: string };
    parameters?: Record<string, unknown>;
    outputContexts?: Array<{ name: string; parameters?: Record<string, unknown> }>;
  };
}

class DialogflowClient {
  private sessionId: string;

  constructor() {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('dialogflow-session') : null;
    this.sessionId = stored || uuidv4();
    if (typeof window !== 'undefined' && !stored) {
      localStorage.setItem('dialogflow-session', this.sessionId);
    }
  }

  // Changed payload type from 'any' to 'Record<string, unknown>'
  private async sendRequest(payload: Record<string, unknown>): Promise<DialogflowResponse> {
    try {
      const response = await fetch('/api/dialogflow/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, sessionId: this.sessionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const res = await response.json();
      return res.data || res; // Handle wrapped responses
    } catch (error) {
      console.error('Dialogflow Client Error:', error);
      throw error;
    }
  }

  async sendMessage(text: string, isAuthenticated: boolean = false, authContext: boolean = false): Promise<DialogflowResponse> {
    return this.sendRequest({ text, isAuthenticated, authContext });
  }

  async sendEvent(event: string, isAuthenticated: boolean = false): Promise<DialogflowResponse> {
    return this.sendRequest({ event, isAuthenticated });
  }

  parseQuickReplies(fulfillmentMessages?: DialogflowFulfillmentMessage[]): string[] {
    if (!fulfillmentMessages) return [];
    for (const message of fulfillmentMessages) {
      if (message.quickReplies?.quickReplies) return message.quickReplies.quickReplies;
    }
    return [];
  }

  parsePayload(fulfillmentMessages?: DialogflowFulfillmentMessage[]): Record<string, unknown> | null {
    if (!fulfillmentMessages) return null;
    for (const message of fulfillmentMessages) {
      if (message.payload && message.payload.fields) {
        const formatted: Record<string, unknown> = {};
        for (const key in message.payload.fields) {
          const field = message.payload.fields[key];
          if (field.stringValue !== undefined) formatted[key] = field.stringValue;
          else if (field.numberValue !== undefined) formatted[key] = field.numberValue;
          else if (field.boolValue !== undefined) formatted[key] = field.boolValue;
        }
        return formatted;
      }
    }
    return null;
  }

  setAuthenticated(auth: boolean) {
    if (typeof window !== 'undefined') localStorage.setItem('dialogflow-authenticated', auth.toString());
  }

  isAuthenticated(): boolean {
    if (typeof window !== 'undefined') return localStorage.getItem('dialogflow-authenticated') === 'true';
    return false;
  }

  clearSession() {
    this.sessionId = uuidv4();
    if (typeof window !== 'undefined') {
      localStorage.setItem('dialogflow-session', this.sessionId);
      localStorage.removeItem('dialogflow-authenticated');
    }
  }
}

export default DialogflowClient;