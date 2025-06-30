import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './useAuth';
import { useTTS } from '../contexts/TTSContext';
import { logger } from '../lib/utils';

export function useChat(initialTab, onLoginRequired, notificationAudioRef) {
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
  const [pendingRequest, setPendingRequest] = useState(null);
  
  const { isAuthenticated, user } = useAuth();
  const { play, isAutoResponseEnabled, isNotificationEnabled } = useTTS();
  
  const AUTH_REQUIRED_INTENTS = [
    'account.balance', 'account.transfer', 'account.transfer - yes', 
    'account.transactions', 'transaction.history', 'balance.check', 
    'account.balance.check', 'fund.transfer', 'account.fund.transfer', 
    'transactions', 'account.transaction.history'
  ];

  const playNotificationSound = useCallback(() => {
    if (isNotificationEnabled && notificationAudioRef.current) {
      notificationAudioRef.current.play().catch(e => logger.error("Error playing notification sound", e));
      return new Promise(resolve => setTimeout(resolve, 500));
    }
    return Promise.resolve();
  }, [isNotificationEnabled, notificationAudioRef]);

  const addMessage = useCallback((tab, author, type, content, id = uuidv4()) => {
    setMessages(prev => {
      const newMessages = [...prev[tab], {
        id, author, type, content, timestamp: new Date()
      }];
      return { ...prev, [tab]: newMessages };
    });
  }, []);

  const updateMessageContent = useCallback((tab, messageId, newContent) => {
    setMessages(prev => ({
      ...prev,
      [tab]: prev[tab].map(msg => 
        msg.id === messageId ? { ...msg, content: newContent } : msg
      ),
    }));
  }, []);

  const getLoginMessage = (intentName) => {
    const messages = {
      'account.balance': "Please log in to view your account balance. I'll show you the information right after you sign in.",
      'account.transactions': "Please log in to view your transaction history. I'll show you the information right after you sign in.",
      'account.transfer': "Please log in to complete your transfer. I'll process your request right after you sign in.",
      'transaction.history': "Please log in to view your transaction history. I'll show you the information right after you sign in.",
    };
    
    return messages[intentName] || "For security, please log in to access your account information.";
  };

  const processPendingRequest = useCallback(async (request) => {
    logger.debug('Processing pending request', { intent: request.intentName });
    
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        logger.error('No auth token found when processing pending request');
        return;
      }

      const response = await fetch('/api/chat/banking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: request.message, 
          sessionId: request.sessionId 
        }),
      });

      const data = await response.json();
      logger.debug('Pending request API response', data);

      if (data.success) {
        await playNotificationSound();
        addMessage(request.tab, 'bot', 'structured', data.response);
        
        if (data.sessionId) {
          localStorage.setItem(`sessionId_${user?.id || 'guest'}`, data.sessionId);
        }
        
        logger.debug('Pending request completed successfully');
      } else {
        await playNotificationSound();
        addMessage(request.tab, 'bot', 'structured', { 
          speakableText: data.error 
        });
        logger.error('Pending request failed', { error: data.error });
      }
    } catch (error) {
      logger.error('Error processing pending request', error);
      await playNotificationSound();
      addMessage(request.tab, 'bot', 'structured', { 
        speakableText: "I'm sorry, there was an issue processing your request. Please try again." 
      });
    }
  }, [addMessage, user, playNotificationSound]);

  useEffect(() => {
    if (isAuthenticated && pendingRequest) {
      logger.debug('Login detected. Processing pending request...');
      
      const timer = setTimeout(() => {
          processPendingRequest(pendingRequest);
          setPendingRequest(null);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, pendingRequest, processPendingRequest]);
  
  const processMessage = useCallback(async (message, tab) => {
    setLoading(true);

    addMessage(tab, 'user', 'text', message);

    try {
      if (tab === 'advisor') {
        const messageHistory = messages.advisor.map(msg => ({
          role: msg.author === 'user' ? 'user' : 'assistant',
          content: msg.type === 'text' ? msg.content : msg.content.speakableText
        }));

        const response = await fetch('/api/chat/financial-advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            messages: [...messageHistory, { role: 'user', content: message }] 
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to fetch advisor response');
        }

        await playNotificationSound();
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

        if (isAutoResponseEnabled && streamedContent) {
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
        
        await playNotificationSound();

        if (data.success) {
          const responsePayload = data.response;
          
          if (AUTH_REQUIRED_INTENTS.includes(responsePayload.intentName) && !isAuthenticated) {
            logger.warn('Authentication required for intent', { intent: responsePayload.intentName });
            
            const loginMessage = getLoginMessage(responsePayload.intentName);
            addMessage(tab, 'bot', 'structured', { speakableText: loginMessage });
            
            const pending = { 
              message, 
              tab, 
              sessionId: data.sessionId, 
              intentName: responsePayload.intentName,
              timestamp: new Date()
            };
            
            logger.debug('Storing pending request', pending);
            setPendingRequest(pending);
            
            onLoginRequired();
            setLoading(false);
            return;
          }

          addMessage(tab, 'bot', 'structured', responsePayload);
          
          if (data.sessionId) {
            localStorage.setItem(`sessionId_${user?.id || 'guest'}`, data.sessionId);
          }
        } else {
          addMessage(tab, 'bot', 'structured', { speakableText: data.error });
        }
      }
    } catch (error) {
      logger.error('Chat processing error', error);
      await playNotificationSound();
      addMessage(tab, 'bot', 'structured', { 
        speakableText: "Sorry, I encountered an error. Please try again." 
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, messages, onLoginRequired, addMessage, updateMessageContent, isAutoResponseEnabled, play, processPendingRequest, playNotificationSound]);

  return { 
    messages, 
    loading, 
    processMessage
  };
}