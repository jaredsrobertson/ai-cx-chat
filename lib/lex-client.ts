// lib/lex-client.ts
import { v4 as uuidv4 } from 'uuid';

// Interface for a single message from Lex
interface LexSDKMessage {
  content: string;
  contentType: 'PlainText' | 'ImageResponseCard' | 'CustomPayload';
  imageResponseCard?: any; 
}

// Updated interface to match the actual Lex V2 SDK response
export interface LexResponse {
  messages?: LexSDKMessage[];
  sessionState?: {
    intent?: {
      name: string;
      state: 'Fulfilled' | 'InProgress' | 'Failed';
    };
    dialogAction?: {
      type: 'ElicitIntent' | 'ElicitSlot' | 'ConfirmIntent' | 'Delegate' | 'Close';
      slotToElicit?: string;
    }
  };
  sessionId?: string;
}

class LexClient {
  private sessionId: string;

  constructor() {
    const stored = localStorage.getItem('lex-session');
    this.sessionId = stored || uuidv4();
    if (!stored) {
      localStorage.setItem('lex-session', this.sessionId);
    }
  }

  async sendMessage(text: string): Promise<LexResponse> {
    try {
      const response = await fetch('/api/lex/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sessionId: this.sessionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message to Lex:', error);
      throw error;
    }
  }

  // Helper to get the primary text message from the response
  public parseText(response: LexResponse): string {
    if (!response.messages || response.messages.length === 0) {
      return "Sorry, I didn't understand. Can you rephrase?";
    }
    const plainTextMessage = response.messages.find(m => m.contentType === 'PlainText');
    return plainTextMessage?.content || "I received a response I can't display.";
  }

  // Helper to extract quick replies (image response cards)
  public parseQuickReplies(response: LexResponse): string[] {
    if (!response.messages) return [];
    
    const card = response.messages.find(m => m.contentType === 'ImageResponseCard');
    if (card && card.imageResponseCard?.buttons) {
      return card.imageResponseCard.buttons.map((button: { text: string }) => button.text);
    }
    return [];
  }

  public clearSession() {
    this.sessionId = uuidv4();
    localStorage.setItem('lex-session', this.sessionId);
  }

  public getSessionId(): string {
    return this.sessionId;
  }
}

export default LexClient;