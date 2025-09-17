// lib/lex-client.ts
import { v4 as uuidv4 } from 'uuid';

export interface LexMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  quickReplies?: string[];
}

export interface LexResponse {
  message?: string;
  sessionState?: {
    intent?: {
      name: string;
      state: string;
    };
    sessionAttributes?: Record<string, string>;
  };
  messages?: Array<{
    content: string;
    contentType: string;
  }>;
}

// Placeholder Lex client - to be fully implemented in Phase 3
class LexClient {
  private sessionId: string;
  private botId: string;
  private botAliasId: string;

  constructor() {
    // Get or create session ID
    const stored = localStorage.getItem('lex-session');
    this.sessionId = stored || uuidv4();
    if (!stored) {
      localStorage.setItem('lex-session', this.sessionId);
    }
    
    // These will be set from environment variables
    this.botId = process.env.NEXT_PUBLIC_LEX_BOT_ID || '';
    this.botAliasId = process.env.NEXT_PUBLIC_LEX_BOT_ALIAS_ID || '';
  }

  async sendMessage(text: string): Promise<LexResponse> {
    try {
      const response = await fetch('/api/lex/process', {
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
      console.error('Error sending message to Lex:', error);
      throw error;
    }
  }

  // Clear session
  clearSession() {
    this.sessionId = uuidv4();
    localStorage.setItem('lex-session', this.sessionId);
  }

  // Get session ID
  getSessionId(): string {
    return this.sessionId;
  }
}

export default LexClient;