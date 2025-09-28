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

      const lexResponse = await response.json();
      
      // DEBUG: Log the entire Lex response
      console.log('=== LEX RESPONSE DEBUG ===');
      console.log('Full Lex response:', JSON.stringify(lexResponse, null, 2));
      console.log('Messages array:', lexResponse.messages);
      if (lexResponse.messages) {
        lexResponse.messages.forEach((msg: LexSDKMessage, index: number) => {
          console.log(`Message ${index}:`, {
            contentType: msg.contentType,
            content: msg.content,
            imageResponseCard: msg.imageResponseCard
          });
        });
      }
      console.log('=== END LEX DEBUG ===');

      return lexResponse;
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
    console.log('=== PARSING QUICK REPLIES ===');
    console.log('Response messages:', response.messages);
    
    if (!response.messages) {
      console.log('No messages in response');
      return [];
    }
    
    const card = response.messages.find(m => m.contentType === 'ImageResponseCard');
    console.log('Found ImageResponseCard:', card);
    
    if (card && card.imageResponseCard?.buttons) {
      const buttons = card.imageResponseCard.buttons.map((button: { text: string; value: string }) => button.text);
      console.log('Extracted buttons:', buttons);
      return buttons;
    }
    
    console.log('No quick replies found');
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