// store/chatStore.ts
import { create } from 'zustand';
import { ChatMessage } from '@/types';

interface AuthRequirement {
  required: boolean;
  message: string;
}

interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  isAuthenticated: boolean;
  authRequired: AuthRequirement;
  sessionId: string;
  pendingMessage: string | null; // <--- ADD THIS

  // Actions
  addMessage: (msg: ChatMessage) => void;
  setTyping: (isTyping: boolean) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setAuthRequired: (auth: AuthRequirement) => void;
  setPendingMessage: (msg: string | null) => void; // <--- ADD THIS
  resetConversation: () => void;
}

// Simple UUID generator for guest sessions
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,
  isAuthenticated: false,
  authRequired: { required: false, message: '' },
  sessionId: typeof window !== 'undefined' ? (localStorage.getItem('chat_session_id') || generateUUID()) : 'init',
  pendingMessage: null, // <--- INITIALIZE THIS

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setTyping: (isTyping) => set({ isTyping }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setAuthRequired: (authRequired) => set({ authRequired }),
  setPendingMessage: (pendingMessage) => set({ pendingMessage }), // <--- ACTION IMPLEMENTATION
  
  resetConversation: () => set({ 
    messages: [], 
    isTyping: false, 
    pendingMessage: null,
    isAuthenticated: false,
    authRequired: { required: false, message: '' }
  }),
}));

if (typeof window !== 'undefined' && !localStorage.getItem('chat_session_id')) {
  localStorage.setItem('chat_session_id', generateUUID());
}