export interface DialogflowMessage {
  text?: { text: string[] };
  quickReplies?: { quickReplies: string[] };
  payload?: {
    fields: Record<string, {
      stringValue?: string;
      boolValue?: boolean;
    }>;
  };
}

export interface DialogflowQueryResult {
  fulfillmentText?: string;
  fulfillmentMessages?: DialogflowMessage[];
  intent?: { displayName: string };
  intentDetectionConfidence?: number;
  outputContexts?: Array<{
    name: string;
    lifespanCount?: number;
    parameters?: { fields: Record<string, any> };
  }>;
}