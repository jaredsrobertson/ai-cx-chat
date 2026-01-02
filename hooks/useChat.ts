// hooks/useChat.ts
import { useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import { signOut } from 'next-auth/react';

export const useChat = () => {
  const { 
    addMessage, 
    setTyping, 
    setAuthRequired, 
    setPendingMessage,
    setAgentModalOpen,
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
        quickReplies: ['Check Balance', 'Transfer Funds', 'Routing Number', 'Hours', 'Locations']
      });
      setTyping(false);
    }, 800);
  }, [addMessage, setTyping]);

  const sendMessage = useCallback(async (text: string, isAuthRetry = false) => {
    if (!text.trim()) return;

    // Only add user message if not an auth retry
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

      console.log('Response received:', { 
        actionRequired: data.actionRequired, 
        currentAuth,
        isAuthRetry,
        authenticated: data.authenticated 
      });

      // Handle Auth Requirement
      if (data.actionRequired === 'REQUIRE_AUTH' && !currentAuth) {
        // Save the original message (including quick replies) for retry after auth
        console.log('Auth required, saving pending message:', text);
        setPendingMessage(text);
        
        setAuthRequired({ 
          required: true, 
          message: data.actionMessage || 'Authentication required for this action' 
        });
        
        // DON'T add bot message here - the modal will show the message
        // This prevents duplicate messages
        setTyping(false);
        return; // Exit early
      
      // Handle Agent Transfer Action
      } else if (data.actionRequired === 'TRANSFER_AGENT') {
        setAgentModalOpen(true);
        addMessage({
          text: data.text,
          isUser: false,
          timestamp: new Date(),
          quickReplies: [],
          intent: data.intent
        });

      } else {
        // Normal response - add bot message
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
      addMessage({ 
        text: "I'm having trouble connecting right now. Please try again.", 
        isUser: false, 
        timestamp: new Date() 
      });
    } finally {
      setTyping(false);
    }
  }, [addMessage, setTyping, setAuthRequired, setPendingMessage, setAgentModalOpen, sessionId]);

  const resetConversation = useCallback(async () => {
    await signOut({ redirect: false });
    resetStore();
    triggerWelcome();
  }, [resetStore, triggerWelcome]);

  return {
    sendMessage,
    triggerWelcome,
    resetConversation
  };
};