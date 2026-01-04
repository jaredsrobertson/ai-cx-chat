import { useCallback, useRef } from 'react';
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
    sessionId
  } = useChatStore();

  // Prevent concurrent sends
  const sendingRef = useRef(false);

  const triggerWelcome = useCallback(async () => {
    if (useChatStore.getState().messages.length > 0) return;

    setTyping(true);
    setTimeout(() => {
      addMessage({
        text: 'Welcome to SecureBank! I can help with hours, locations, account balances, transfers, and more. What can I help you with?',
        isUser: false,
        timestamp: new Date(),
        quickReplies: [
          { display: '🕒 Hours', payload: 'What are your hours?' },
          { display: '📍 Locations', payload: 'Where are you located?' },
          { display: '🔢 Routing Number', payload: 'What is your routing number?' },
          { display: '💬 Contact Support', payload: 'How do I contact support?' },
          { display: '💰 Check Balance', payload: 'Check my balance' },
          { display: '💸 Transfer Funds', payload: 'Transfer funds' },
          { display: '📋 Transaction History', payload: 'Show my transaction history' },
          { display: '👤 Talk to Agent', payload: 'Talk to agent' }
        ]
      });
      setTyping(false);
    }, 800);
  }, [addMessage, setTyping]);

  const sendMessage = useCallback(async (text: string, isAuthRetry = false, retryCount = 0) => {
    if (!text || !text.trim()) {
      console.error('sendMessage called with empty text:', { text, isAuthRetry });
      return;
    }
    
    // Prevent concurrent sends
    if (sendingRef.current) {
      console.log('Message send already in progress, skipping duplicate');
      return;
    }

    sendingRef.current = true;

    console.log('Sending message:', { 
      text: text.substring(0, 50), 
      isAuthRetry, 
      retryCount 
    });

    try {
      // Add user message only if not retrying after auth
      if (!isAuthRetry) {
        addMessage({ text, isUser: true, timestamp: new Date() });
      }
      
      setTyping(true);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Explicitly include cookies
        body: JSON.stringify({ text, sessionId }),
      });

      const json = await response.json();
      
      if (!response.ok) {
        throw new Error(json.error || 'API Error');
      }

      const data = json.data;
      
      console.log('API Response:', {
        actionRequired: data.actionRequired,
        hasText: !!data.text,
        intent: data.intent,
        retryCount
      });
      
      // Get current auth state
      const currentAuth = useChatStore.getState().isAuthenticated;

      // Handle auth requirement
      if (data.actionRequired === 'REQUIRE_AUTH') {
        console.log('REQUIRE_AUTH received:', { currentAuth, isAuthRetry, retryCount });
        
        // If this is a retry after login but server still doesn't see session, retry with backoff
        if (currentAuth && isAuthRetry && retryCount < 3) {
          const delay = (retryCount + 1) * 1000; // 1s, 2s, 3s
          console.log(`Server session not ready yet. Retrying in ${delay}ms (attempt ${retryCount + 1}/3)...`);
          setTyping(false);
          sendingRef.current = false;
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return sendMessage(text, true, retryCount + 1);
        }
        
        // Normal auth requirement (user not authenticated on client either)
        if (!currentAuth) {
          console.log('User not authenticated, showing login modal');
          setPendingMessage(text);
          setAuthRequired({ 
            required: true, 
            message: data.actionMessage || 'Authentication required for this action' 
          });
          setTyping(false);
          sendingRef.current = false;
          return;
        }
        
        // Retry limit exceeded - give up
        console.error('Retry limit exceeded. Server session failed to sync.');
        addMessage({ 
          text: "I'm having trouble verifying your authentication. Please try your request again.", 
          isUser: false, 
          timestamp: new Date() 
        });
        setTyping(false);
        sendingRef.current = false;
        return;
      }

      // Handle agent transfer
      if (data.actionRequired === 'TRANSFER_AGENT') {
        setAgentModalOpen(true);
        addMessage({
          text: data.text,
          isUser: false,
          timestamp: new Date(),
          intent: data.intent
        });
        setTyping(false);
        sendingRef.current = false;
        return;
      }

      // Normal response
      console.log('Adding bot response:', {
        text: data.text?.substring(0, 100),
        hasText: !!data.text,
        hasQRBs: !!data.quickReplies,
        intent: data.intent
      });

      // Defensive check - ensure we have text
      const responseText = data.text || "I processed your request but didn't receive a response message.";
      
      addMessage({
        text: responseText,
        isUser: false,
        timestamp: new Date(),
        quickReplies: data.quickReplies,
        intent: data.intent,
        sources: data.sources
      });

    } catch (error) {
      console.error('Send Message Error:', error);
      addMessage({ 
        text: "I'm having trouble connecting. Please try again.", 
        isUser: false, 
        timestamp: new Date() 
      });
    } finally {
      setTyping(false);
      sendingRef.current = false;
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