import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './useAuth';
import { useTTS } from '../contexts/TTSContext';

export function useChat(initialTab, onLoginRequired) {
  const [messages, setMessages] = useState({
    banking: [{
      id: uuidv4(),
      author: 'bot',
      type: 'structured',
      content: { speakableText: "Welcome to the SecureBank Concierge. I can help you with account balances, transaction history, and fund transfers. You can also ask to speak with a live agent. How can I assist you today?" },
      timestamp: new Date()
    }],
    advisor: [{
      id: uuidv4(),
      author: 'bot',
      type: 'structured',
      content: { speakableText: "Welcome to the AI Advisor. I can help with financial planning, budgeting, and investment questions. What's on your mind?" },
      timestamp: new Date()
    }]
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const { isAuthenticated, user } = useAuth();
  const [pendingRequest, setPendingRequest] = useState(null);
  const fallbackCount = useRef(0);
  const { play, isAutoResponseEnabled } = useTTS();
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const isProcessingAuth = useRef(false);

  const getIntentsRequiringAuth = () => {
    return [
      'account.balance', 'account.transfer', 'account.transfer - yes', 'account.transactions',
      'transaction.history', 'balance.check', 'account.balance.check', 'fund.transfer',
      'account.fund.transfer', 'transactions', 'account.transaction.history'
    ];
  };

  const requiresAuthentication = (intentName) => {
    const authIntents = getIntentsRequiringAuth();
    return authIntents.includes(intentName);
  };

  const addMessage = useCallback((tab, author, type, content, id = uuidv4()) => {
    const fallbackText = "I'm sorry, I didn't quite understand.";
    const agentOfferText = "It seems I'm still having trouble. Would you like to speak with a live agent?";

    setMessages(prev => {
      let newMessagesForTab = [...prev[tab], {
        id: id, author, type, content, timestamp: new Date()
      }];

      if (author === 'bot' && content.speakableText) {
        if (content.speakableText.startsWith(fallbackText)) {
          fallbackCount.current += 1;
        } else {
          fallbackCount.current = 0;
        }

        if (fallbackCount.current >= 2) {
          newMessagesForTab.push({
            id: uuidv4(), author: 'bot', type: 'structured',
            content: { speakableText: agentOfferText }, timestamp: new Date()
          });
          fallbackCount.current = 0;
        }
      }
      return { ...prev, [tab]: newMessagesForTab };
    });
  }, []);

  const updateMessageContent = useCallback((tab, messageId, newContent) => {
    setMessages(prev => ({
      ...prev,
      [tab]: prev[tab].map(msg => msg.id === messageId ? { ...msg, content: newContent } : msg),
    }));
  }, []);

  const processMessage = useCallback(async (message, tab) => {
    setLoading(true);

    try {
      if (tab === 'advisor') {
        addMessage(tab, 'user', 'text', message);
        const messageHistory = messages.advisor.map(msg => ({
          role: msg.author === 'user' ? 'user' : 'assistant',
          content: msg.type === 'text' ? msg.content : msg.content.speakableText
        }));

        const response = await fetch('/api/chat/financial-advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [...messageHistory, { role: 'user', content: message }] })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to fetch');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamedContent = '';
        const placeholderId = uuidv4();
        addMessage(tab, 'bot', 'text', '...', placeholderId);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          streamedContent += decoder.decode(value, { stream: true });
          updateMessageContent(tab, placeholderId, { speakableText: streamedContent });
        }

        if (isAutoResponseEnabled) {
          play(streamedContent, placeholderId);
        }

      } else {
        const sessionId = localStorage.getItem(`sessionId_${user?.id || 'guest'}`);
        const token = localStorage.getItem('authToken');

        const response = await fetch('/api/chat/banking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ message, sessionId }),
        });

        const data = await response.json();

        if (data.success) {
          const responsePayload = data.data.response;
          
          if (requiresAuthentication(responsePayload.intentName) && !isAuthenticated) {
            console.log(`Intent "${responsePayload.intentName}" requires authentication. Triggering login modal.`);
            
            isProcessingAuth.current = true;
            addMessage(tab, 'user', 'text', message);
            
            const getContextualLoginMessage = (intentName) => {
              switch (intentName) {
                case 'account.balance':
                case 'balance.check':
                case 'account.balance.check':
                  return "Please log in to view your account balance. I'll show you the information right after you sign in.";
                case 'account.transactions':
                case 'transaction.history':
                case 'transactions':
                case 'account.transaction.history':
                  return "Please log in to view your transaction history. I'll show you the information right after you sign in.";
                case 'account.transfer':
                case 'account.transfer - yes':
                case 'fund.transfer':
                case 'account.fund.transfer':
                  return "Please log in to complete your transfer. I'll process your request right after you sign in.";
                default:
                  return responsePayload.speakableText || "For security, please log in to access your account information.";
              }
            };
            
            addMessage(tab, 'bot', 'structured', { 
              speakableText: getContextualLoginMessage(responsePayload.intentName),
              ...responsePayload.confidentialData && { confidentialData: responsePayload.confidentialData }
            });
            
            const pendingReq = { 
              message, tab, sessionId: data.data.sessionId, intentName: responsePayload.intentName,
              timestamp: new Date(), originalResponse: responsePayload
            };
            
            console.log('Storing pending request:', pendingReq);
            setPendingRequest(pendingReq);
            setIsLoginModalOpen(true);
            onLoginRequired();
            
            setLoading(false);
            return;
          }

          addMessage(tab, 'user', 'text', message);
          addMessage(tab, 'bot', 'structured', responsePayload);
          
          if (data.data.sessionId) {
            localStorage.setItem(`sessionId_${user?.id || 'guest'}`, data.data.sessionId);
          }
        } else {
            addMessage(tab, 'user', 'text', message);
            addMessage(tab, 'bot', 'structured', { speakableText: data.error });
        }
      }
    } catch (error) {
      console.error("Chat processing error:", error);
      addMessage(tab, 'user', 'text', message);
      addMessage(tab, 'bot', 'structured', { speakableText: "Sorry, I encountered an error. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, messages, onLoginRequired, addMessage, updateMessageContent, isAutoResponseEnabled, play, requiresAuthentication]);

  // FIXED: Use useRef to track previous values and prevent unnecessary logging
  const prevAuthState = useRef({ isAuthenticated: undefined, pendingRequest: undefined });
  
  useEffect(() => {
    // Only log when auth state or pending request actually changes
    const hasAuthChanged = prevAuthState.current.isAuthenticated !== isAuthenticated;
    const hasPendingChanged = prevAuthState.current.pendingRequest !== pendingRequest;
    
    if (hasAuthChanged || hasPendingChanged) {
      console.log('Auth state changed:', { 
        isAuthenticated, 
        hasPendingRequest: !!pendingRequest, 
        isProcessingAuth: isProcessingAuth.current 
      });
      
      // Update previous values
      prevAuthState.current = { isAuthenticated, pendingRequest };
    }
    
    // FIXED: Process pending request when user becomes authenticated, regardless of processing flag
    if (isAuthenticated && pendingRequest) {
      console.log(`User authenticated. Resuming pending request for intent: ${pendingRequest.intentName}`);
      
      setIsLoginModalOpen(false);
      
      const resumeRequest = async () => {
        try {
          console.log('Resuming request with stored context:', pendingRequest);
          
          // FIXED: Clear the processing flag first
          isProcessingAuth.current = false;
          
          // FIXED: Don't call processMessage again - just make the API call directly
          const sessionId = pendingRequest.sessionId;
          const token = localStorage.getItem('authToken');

          const response = await fetch('/api/chat/banking', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({ message: pendingRequest.message, sessionId }),
          });

          const data = await response.json();

          if (data.success) {
            const responsePayload = data.data.response;
            
            // Add only the bot response - user message was already added
            addMessage(pendingRequest.tab, 'bot', 'structured', responsePayload);
            
            if (data.data.sessionId) {
              localStorage.setItem(`sessionId_${user?.id || 'guest'}`, data.data.sessionId);
            }
          } else {
            addMessage(pendingRequest.tab, 'bot', 'structured', { speakableText: data.error });
          }
          
          console.log('Successfully resumed pending request after login');
        } catch (error) {
          console.error('Error resuming pending request:', error);
          addMessage(pendingRequest.tab, 'bot', 'structured', { 
            speakableText: "I'm sorry, there was an issue processing your request. Please try again." 
          });
        } finally {
          setPendingRequest(null);
        }
      };

      setTimeout(resumeRequest, 500);
    }
  }, [isAuthenticated, pendingRequest]); // Keep only these essential dependencies

  useEffect(() => {
    if (!isAuthenticated && pendingRequest && !isProcessingAuth.current && !isLoginModalOpen) {
      console.log('User logged out (not during auth processing). Clearing pending request.');
      setPendingRequest(null);
    }
  }, [isAuthenticated, pendingRequest, isLoginModalOpen]);

  const handleLoginSuccess = useCallback(() => {
    console.log('Login successful, auth processing flag cleared');
    isProcessingAuth.current = false;
    setIsLoginModalOpen(false);
  }, []);

  const handleLoginCancel = useCallback(() => {
    console.log('Login cancelled, clearing pending request');
    setPendingRequest(null);
    isProcessingAuth.current = false;
    setIsLoginModalOpen(false);
  }, []);

  return { 
    messages, loading, processMessage, activeTab, setActiveTab,
    handleLoginSuccess, handleLoginCancel, isLoginModalOpen
  };
}