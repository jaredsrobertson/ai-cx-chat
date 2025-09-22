// lib/lex-client.ts
import { v4 as uuidv4 } from 'uuid';

interface Button {
  text: string;
  value: string;
}

interface ImageResponseCard {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttons?: Button[];
}

interface LexSDKMessage {
  contentType: 'PlainText' | 'SSML' | 'CustomPayload' | 'ImageResponseCard';
  content?: string;
  imageResponseCard?: ImageResponseCard;
}

interface LexResponse {
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
  interpretations?: {
    intent?: {
      name: string;
    };
    nluConfidence?: {
      score: number;
    };
  }[];
  sessionId?: string;
}

class LexClient {
  private sessionId: string;

  constructor() {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('lex-session') : null;
    this.sessionId = stored || uuidv4();
    if (typeof window !== 'undefined' && !stored) {
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

  public parseText(response: LexResponse): string {
    if (!response.messages || response.messages.length === 0) {
      return "Sorry, I didn't understand. Can you rephrase?";
    }
    const plainTextMessage = response.messages.find(m => m.contentType === 'PlainText');
    return plainTextMessage?.content || "I received a response I can't display.";
  }

  public parseQuickReplies(response: LexResponse): string[] {
    if (!response.messages) return [];
    
    const card = response.messages.find(m => m.contentType === 'ImageResponseCard');
    if (card && card.imageResponseCard?.buttons) {
      return card.imageResponseCard.buttons.map((button: { text: string; value: string }) => button.text);
    }
    return [];
  }

  public getNLUConfidence(response: LexResponse): number | undefined {
    return response.interpretations?.[0]?.nluConfidence?.score;
  }

  public clearSession() {
    this.sessionId = uuidv4();
    if (typeof window !== 'undefined') {
      localStorage.setItem('lex-session', this.sessionId);
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }
}

export default LexClient;
