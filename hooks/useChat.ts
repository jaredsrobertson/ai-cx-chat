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
    setDetectedIntent, // <--- NEW
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
      
      if (!response.ok) {
        throw new Error(json.error || 'API Error');
      }

      const data = json.data;
      
      // Get FRESH auth state from store (not stale closure)
      const currentAuth = useChatStore.getState().isAuthenticated;

      console.log('Response received:', { 
        actionRequired: data.actionRequired, 
        currentAuth,
        isAuthRetry,
        authenticated: data.authenticated,
        text: data.text.substring(0, 50) + '...'
      });

      // Handle Auth Requirement
      // IMPORTANT: Only trigger auth flow if user is NOT authenticated
      // This prevents re-triggering auth after user just logged in
      if (data.actionRequired === 'REQUIRE_AUTH' && !currentAuth) {
        console.log('Auth required for action, saving pending message');
        
        // Save the original message for retry after auth
        setPendingMessage(text);
        
        // Capture intent even if auth is required
        if (data.intent) {
            setDetectedIntent(data.intent);
        }
        
        setAuthRequired({ 
          required: true, 
          message: data.actionMessage || 'Authentication required for this action' 
        });
        
        // DON'T add bot message - modal will handle this
        setTyping(false);
        return;
      
      // If we got auth required but user IS authenticated, it means session sync failed
      // Log error but continue to show the response
      } else if (data.actionRequired === 'REQUIRE_AUTH' && currentAuth) {
        console.error('UNEXPECTED: Got auth required even though user is authenticated');
        console.error('This indicates a session sync issue between client and server');
        
        // Show the message anyway - it's better than leaving user hanging
        addMessage({
          text: 'There was a synchronization issue. Please try your request again.',
          isUser: false,
          timestamp: new Date(),
          quickReplies: ['Check Balance', 'Transfer Funds', 'Talk to Agent']
        });
        
      // Handle Agent Transfer Action
      } else if (data.actionRequired === 'TRANSFER_AGENT') {
        setAgentModalOpen(true);
        if (data.intent) setDetectedIntent(data.intent); // Update intent
        addMessage({
          text: data.text,
          isUser: false,
          timestamp: new Date(),
          quickReplies: [],
          intent: data.intent
        });

      } else {
        // Normal response - add bot message
        console.log('Adding bot response:', {
          intent: data.intent,
          hasQuickReplies: !!data.quickReplies,
          hasSources: !!data.sources
        });

        if (data.intent) setDetectedIntent(data.intent); // Update intent
        
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
  }, [addMessage, setTyping, setAuthRequired, setPendingMessage, setAgentModalOpen, setDetectedIntent, sessionId]);

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