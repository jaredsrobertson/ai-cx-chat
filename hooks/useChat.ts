import { useCallback, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { signOut } from 'next-auth/react';
import { STANDARD_QUICK_REPLIES } from '@/lib/chat-constants';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 3000]; // Exponential backoff

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

  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingRequestRef = useRef<Promise<void> | null>(null);

  const triggerWelcome = useCallback(async () => {
    if (useChatStore.getState().messages.length > 0) return;

    setTyping(true);
    setTimeout(() => {
      addMessage({
        text: 'Welcome to SecureBank! I can help with hours, locations, account balances, transfers, and more. What can I help you with?',
        isUser: false,
        timestamp: new Date(),
        quickReplies: STANDARD_QUICK_REPLIES
      });
      setTyping(false);
    }, 800);
  }, [addMessage, setTyping]);

  const handleChatResponse = useCallback(async (
    data: any,
    originalText: string,
    isAuthRetry: boolean,
    retryCount: number
  ) => {
    const currentAuth = useChatStore.getState().isAuthenticated;

    // Handle authentication requirement
    if (data.actionRequired === 'REQUIRE_AUTH') {
      // If authenticated on client but server still doesn't see it, retry with backoff
      if (currentAuth && isAuthRetry && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount] || 3000;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendMessage(originalText, true, retryCount + 1);
      }
      
      // User not authenticated - show login modal
      if (!currentAuth) {
        setPendingMessage(originalText);
        setAuthRequired({ 
          required: true, 
          message: data.actionMessage || 'Authentication required for this action' 
        });
        return;
      }
      
      // Retry limit exceeded
      addMessage({ 
        text: "I'm having trouble verifying your authentication. Please try your request again.", 
        isUser: false, 
        timestamp: new Date() 
      });
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
      return;
    }

    // Normal response
    const responseText = data.text || "I processed your request.";
    
    addMessage({
      text: responseText,
      isUser: false,
      timestamp: new Date(),
      quickReplies: data.quickReplies,
      intent: data.intent,
      sources: data.sources
    });
  }, [addMessage, setAuthRequired, setPendingMessage, setAgentModalOpen]);

  const sendMessage = useCallback(async (
    text: string, 
    isAuthRetry = false, 
    retryCount = 0
  ): Promise<void> => {
    if (!text?.trim()) {
      return;
    }
    
    // Cancel previous request if still in flight
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Wait for previous request to complete
    if (pendingRequestRef.current) {
      await pendingRequestRef.current.catch(() => {}); // Ignore aborted errors
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // Create promise for this request
    const requestPromise = (async () => {
      try {
        // Add user message only if not retrying after auth
        if (!isAuthRetry) {
          addMessage({ text, isUser: true, timestamp: new Date() });
        }
        
        setTyping(true);

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: controller.signal,
          body: JSON.stringify({ text, sessionId }),
        });

        // Check if request was aborted
        if (controller.signal.aborted) {
          return;
        }

        if (!response.ok) {
          const json = await response.json();
          throw new Error(json.error || 'API Error');
        }

        const json = await response.json();
        const data = json.data;
        
        // Handle response
        await handleChatResponse(data, text, isAuthRetry, retryCount);
        
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        
        console.error('Send message error:', error);
        
        addMessage({ 
          text: "I'm having trouble connecting. Please try again.", 
          isUser: false, 
          timestamp: new Date() 
        });
        
      } finally {
        setTyping(false);
        
        // Clear refs only if this is still the current controller
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          pendingRequestRef.current = null;
        }
      }
    })();
    
    pendingRequestRef.current = requestPromise;
    return requestPromise;
    
  }, [addMessage, setTyping, sessionId, handleChatResponse]);

  const resetConversation = useCallback(async () => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    await signOut({ redirect: false });
    resetStore();
    triggerWelcome();
  }, [resetStore, triggerWelcome]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    sendMessage,
    triggerWelcome,
    resetConversation
  };
};