// lib/bots.js
import { v4 as uuidv4 } from 'uuid';

export const BOTS = {
  banking: {
    id: 'banking',
    name: 'CloudBank Concierge',
    description: 'Check balances, transfer funds, and view transactions.',
    initialMessage: {
      id: uuidv4(),
      author: 'bot',
      type: 'structured',
      content: {
        speakableText: "Welcome to the SecureBank Concierge. I can help you with account balances, transaction history, and fund transfers. You can also ask to speak with a live agent. How can I assist you today?"
      },
      timestamp: new Date()
    }
  },
  advisor: {
    id: 'advisor',
    name: 'AI Advisor',
    description: 'Get general financial advice and planning tips.',
    initialMessage: {
      id: uuidv4(),
      author: 'bot',
      type: 'structured',
      content: {
        speakableText: "Welcome to the AI Advisor. I can help with financial planning, budgeting, and investment questions. What's on your mind?"
      },
      timestamp: new Date()
    }
  },
  knowledge: {
    id: 'knowledge',
    name: 'Knowledge Base',
    description: "Ask about our products and services.",
    initialMessage: {
      id: uuidv4(),
      author: 'bot',
      type: 'structured',
      content: {
        speakableText: "Welcome! Ask me anything about CloudBank's products, services, or policies."
      },
      timestamp: new Date()
    }
  }
};