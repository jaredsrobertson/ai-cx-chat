// hooks/useChat.ts
import { useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';

export const useChat = () => {
  const { 
    addMessage, 
    setTyping, 
    setAuthRequired, 
    setPendingMessage, // <--- DESTRUCTURE THIS
    resetConversation: resetStore,
    isAuthenticated,
    sessionId
  } = useChatStore();

  const triggerWelcome = useCallback(async () => {
    if (useChatStore.getState().messages.length > 0) return;

    setTyping(true);
    setTimeout(() => {
      addMessage({
        text: 'Welcome to SecureBank AI! I can help you with your accounts, transfers, or answer your support questions. How can I help you today?',
        isUser: false,
        timestamp: new Date(),
        quickReplies: ['Check Balance', 'Transfer Money', 'Hours', 'Lost Card']
      });
      setTyping(false);
    }, 800);
  }, [addMessage, setTyping]);

  const sendMessage = useCallback(async (text: string, isAuthRetry = false) => {
    if (!text.trim()) return;

    // Only add user message to UI if it's NOT a retry (to avoid duplicates)
    if (!isAuthRetry) {
        addMessage({ text, isUser: true, timestamp: new Date() });
    }
    
    setTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sessionId }),
      });

      const json = await response.json();
      
      if (!response.ok) throw new Error(json.error || 'API Error');

      const data = json.data;
      const currentAuth = useChatStore.getState().isAuthenticated;

      // Check if the backend is asking for authentication
      if (data.actionRequired === 'REQUIRE_AUTH' && !currentAuth) {
        // --- KEY FIX STARTS HERE ---
        // Save the intent so we can replay it after login
        setPendingMessage(text); 
        // --- KEY FIX ENDS HERE ---

        setAuthRequired({ 
          required: true, 
          message: data.actionMessage || 'Authentication required for this action' 
        });
        
        addMessage({
          text: data.text,
          isUser: false,
          timestamp: new Date(),
          quickReplies: data.quickReplies,
          intent: data.intent
        });
      } else {
        addMessage({
          text: data.text,
          isUser: false,
          timestamp: new Date(),
          quickReplies: data.quickReplies,
          intent: data.intent,
          sources: data.sources 
        });
      }

    } catch (error) {
      console.error('SendMessage Error:', error);
      addMessage({ text: "I'm having trouble connecting right now. Please try again.", isUser: false, timestamp: new Date() });
    } finally {
      setTyping(false);
    }
  }, [addMessage, setTyping, setAuthRequired, setPendingMessage, sessionId]); // Added setPendingMessage dependency

  const resetConversation = useCallback(() => {
    resetStore();
  }, [resetStore]);

  return {
    sendMessage,
    triggerWelcome,
    resetConversation
  };
};