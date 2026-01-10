import { useCallback, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { signOut } from 'next-auth/react';
import { STANDARD_QUICK_REPLIES } from '@/lib/chat-constants';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 3000];

// Custom error classes for better error handling
class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

class AuthError extends Error {
  constructor(message: string = 'Authentication error') {
    super(message);
    this.name = 'AuthError';
  }
}

class APIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'APIError';
  }
}

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

    if (data.actionRequired === 'REQUIRE_AUTH') {
      if (currentAuth && isAuthRetry && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount] || 3000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendMessage(originalText, true, retryCount + 1);
      }
      
      if (!currentAuth) {
        setPendingMessage(originalText);
        setAuthRequired({ 
          required: true, 
          message: data.actionMessage || 'Authentication required for this action' 
        });
        return;
      }
      
      addMessage({ 
        text: "I'm having trouble verifying your authentication. Please try your request again.", 
        isUser: false, 
        timestamp: new Date() 
      });
      return;
    }

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
    if (!text?.trim()) return;
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Wait for previous request to complete
    if (pendingRequestRef.current) {
      await pendingRequestRef.current.catch(() => {});
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    const requestPromise = (async () => {
      try {
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

        // Check if aborted
        if (controller.signal.aborted) return;

        // Handle non-OK responses with proper error types
        if (!response.ok) {
          if (response.status === 401) {
            throw new AuthError('Authentication required');
          }
          
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            throw new APIError(`Server error: ${response.status}`, response.status);
          }
          
          throw new APIError(errorData.error || 'API Error', response.status);
        }

        const json = await response.json();
        
        // Validate response structure
        if (!json.data) {
          throw new APIError('Invalid response from server');
        }

        await handleChatResponse(json.data, text, isAuthRetry, retryCount);
        
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        
        // Enhanced error logging with proper serialization
        if (error instanceof Error) {
          console.error('Chat error:', {
            type: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
        } else {
          console.error('Unknown chat error:', error);
        }
        
        // User-friendly error messages
        let errorMessage = "I'm having trouble connecting. Please try again.";
        
        if (error instanceof AuthError) {
          errorMessage = "Your session has expired. Please log in again.";
          setAuthRequired({ required: true, message: errorMessage });
          return;
        } else if (error instanceof NetworkError || (error instanceof TypeError && error.message.includes('fetch'))) {
          errorMessage = "Cannot connect to server. Please check your internet connection.";
        } else if (error instanceof APIError) {
          if (error.statusCode === 500) {
            errorMessage = "Server error. Our team has been notified. Please try again later.";
          } else if (error.statusCode === 404) {
            errorMessage = "Service temporarily unavailable. Please try again.";
          } else if (error.message && error.message !== 'API Error') {
            errorMessage = error.message;
          }
        }
        
        addMessage({ 
          text: errorMessage, 
          isUser: false, 
          timestamp: new Date() 
        });
        
      } finally {
        setTyping(false);
        
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          pendingRequestRef.current = null;
        }
      }
    })();
    
    pendingRequestRef.current = requestPromise;
    return requestPromise;
    
  }, [addMessage, setTyping, sessionId, handleChatResponse, setAuthRequired]);

  const resetConversation = useCallback(async () => {
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