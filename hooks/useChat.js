// hooks/useChat.js - Final Version with Clean Response Integration

import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/hooks/useAuth';
import { useTTS } from '@/contexts/TTSContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { logger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

const { MESSAGES } = CONFIG;

// Dialogflow integration
async function detectDialogflowIntent(message, sessionId, token) {
  const response = await fetch('/api/dialogflow/detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId, token }),
  });

  if (!response.ok) {
    throw new Error('Failed to communicate with Dialogflow');
  }

  const result = await response.json();
  return result.data;
}

// Enhanced response formatting for clean Dialogflow responses
function formatDialogflowResponse(response) {
  logger.debug('Processing Dialogflow response', { 
    intent: response.intent?.displayName,
    hasFulfillmentText: !!response.fulfillmentText,
    messageCount: response.fulfillmentMessages?.length || 0
  });

  // Start with Dialogflow's response text (our clean, consistent responses)
  let speakableText = response.fulfillmentText || "I'm having trouble right now. Please try again.";
  
  // Check for custom payload from our webhook
  const customMessage = response.fulfillmentMessages?.find(msg => msg.payload);
  
  if (customMessage?.payload) {
    const payload = customMessage.payload;
    
    const responseData = {
      speakableText: speakableText, // Use Dialogflow's consistent response
      action: payload.action,
      intentName: payload.intentName || response.intent?.displayName,
    };

    // Handle auth required differently - use custom auth message
    if (payload.action === 'AUTH_REQUIRED') {
      responseData.speakableText = payload.authMessage || speakableText;
    }

    // Handle confidential data from webhook
    if (payload.confidentialData) {
      responseData.confidentialData = payload.confidentialData;
    }

    return responseData;
  }

  // Standard response from Dialogflow
  return { 
    speakableText,
    intentName: response.intent?.displayName,
  };
}

// Banking message processing
async function processBankingMessage({ message, user, isAuthenticated, onLoginRequired, setPendingRequest }) {
  const sessionId = localStorage.getItem(`sessionId_${user?.id || 'guest'}`) || uuidv4();
  localStorage.setItem(`sessionId_${user?.id || 'guest'}`, sessionId);
  const token = localStorage.getItem('authToken');

  try {
    // Send to Dialogflow for conversation management
    const dialogflowResponse = await detectDialogflowIntent(message, sessionId, token); 
    const responsePayload = formatDialogflowResponse(dialogflowResponse);

    // Check if webhook requested authentication
    if (responsePayload.action === 'AUTH_REQUIRED' && !isAuthenticated) {
      const pending = { 
        message, 
        tab: 'banking', 
        sessionId, 
        intentName: responsePayload.intentName, 
        timestamp: new Date()
      };
      setPendingRequest(pending);
      onLoginRequired();
      return { requiresAuth: true, loginMessage: responsePayload.speakableText };
    }
    
    // Normal response from Dialogflow + webhook
    return { success: true, response: responsePayload };
    
  } catch (error) {
    logger.error('Banking message processing failed', error);
    throw new Error('I\'m having trouble connecting to my services. Please try again.');
  }
}

// Other processing functions (unchanged)
async function processAdvisorMessage(message, messageHistory) {
  const response = await fetch('/api/chat/financial-advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [...messageHistory, { role: 'user', content: message }]
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to fetch advisor response');
  }

  return response.text();
}

async function processKnowledgeMessage(message) {
  const response = await fetch('/api/chat/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to fetch knowledge base response');
  }

  return response.text();
}

export function useChat(activeTab, onLoginRequired, notificationAudioRef, onAgentRequest) {
  const [messages, setMessages] = useState({
    banking: [{ ...MESSAGES.INITIAL.BANKING, id: uuidv4(), timestamp: new Date() }],
    advisor: [{ ...MESSAGES.INITIAL.ADVISOR, id: uuidv4(), timestamp: new Date() }],
    knowledge: [{ author: 'bot', type: 'structured', content: { speakableText: "Welcome! Ask me anything about CloudBank's products, services, or policies." }, id: uuidv4(), timestamp: new Date() }]
  });

  const [loading, setLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);

  const { isAuthenticated, user } = useAuth();
  const { play, isAutoResponseEnabled, isNotificationEnabled } = useTTS();
  const { addAnalyticsEntry } = useAnalytics();
  const inactivityTimer = useRef(null);
  const proactiveCount = useRef(0);

  // Load and save messages
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('chatMessages');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        if (parsedMessages.banking && parsedMessages.advisor && parsedMessages.knowledge) {
          setMessages(parsedMessages);
        }
      }
    } catch (error) {
      logger.error("Failed to load messages from localStorage", error);
      localStorage.removeItem('chatMessages');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    } catch (error) {
      logger.error("Failed to save messages to localStorage", error);
    }
  }, [messages]);
  
  // Proactive engagement
  useEffect(() => {
    clearTimeout(inactivityTimer.current);
    const currentMessages = messages[activeTab] || [];
    const lastMessage = currentMessages[currentMessages.length - 1];

    if (lastMessage && lastMessage.author === 'bot' && proactiveCount.current < 2) {
      const delay = proactiveCount.current === 0 ? 20000 : 30000;
      
      inactivityTimer.current = setTimeout(() => {
        addMessage(activeTab, 'bot', 'text', { speakableText: "Is there anything else I can help you with today?" });
        proactiveCount.current += 1;
      }, delay);
    }

    return () => clearTimeout(inactivityTimer.current);
  }, [messages, activeTab]);

  const playNotificationSound = useCallback(() => {
    if (isNotificationEnabled && notificationAudioRef.current) {
      notificationAudioRef.current.volume = 0.5;
      notificationAudioRef.current.play().catch(e => logger.error("Error playing notification sound", e));
      return new Promise(resolve => setTimeout(resolve, 500));
    }
    return Promise.resolve();
  }, [isNotificationEnabled, notificationAudioRef]);

  const addMessage = useCallback((tab, author, type, content, id = uuidv4()) => {
    setMessages(prev => {
      const newMessages = { ...prev };
      newMessages[tab] = [...(newMessages[tab] || []), { id, author, type, content, timestamp: new Date() }];
      return newMessages;
    });
    return id;
  }, []);
  
  const analyzeMessage = async (message) => {
    try {
      const response = await fetch('/api/chat/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (response.ok) {
        const analysis = await response.json();
        if(analysis.intent && analysis.sentiment) {
          addAnalyticsEntry({ message, ...analysis });
        }
      }
    } catch (error) {
      logger.error('Failed to analyze message', error);
    }
  };

  // Process pending request after login
  const processPendingRequest = useCallback(async (request) => {
    logger.debug('Processing pending request after authentication', { 
      intent: request.intentName,
      originalMessage: request.message 
    });

    try {
      const data = await processBankingMessage({
        message: request.message,
        user,
        isAuthenticated: true,
        onLoginRequired: () => {},
        setPendingRequest: () => {}
      });

      if (data.success) {
        addMessage(request.tab, 'bot', 'structured', data.response);
        await playNotificationSound();
        
        // Handle special actions
        if (data.response.action === 'AGENT_HANDOFF' && onAgentRequest) {
          onAgentRequest(messages.banking);
        }
        
        // Auto-play TTS if enabled
        if (isAutoResponseEnabled && data.response.speakableText) {
          const messageId = uuidv4();
          play(data.response.speakableText, messageId);
        }
        
        logger.debug('Pending request completed successfully');
      }
    } catch (error) {
      logger.error('Error processing pending request', error);
      addMessage(request.tab, 'bot', 'structured', { 
        speakableText: "I'm sorry, there was an issue processing your request after login. Please try again." 
      });
      await playNotificationSound();
    }
  }, [addMessage, user, playNotificationSound, onAgentRequest, messages.banking, isAutoResponseEnabled, play]);

  useEffect(() => {
    if (isAuthenticated && pendingRequest) {
      logger.debug('User authenticated, processing pending request');
      processPendingRequest(pendingRequest);
      setPendingRequest(null);
    }
  }, [isAuthenticated, pendingRequest, processPendingRequest]);

  // Main message processing
  const processMessage = useCallback(async (message, tab) => {
    clearTimeout(inactivityTimer.current);
    proactiveCount.current = 0;

    addMessage(tab, 'user', 'text', message);
    setLoading(true);
    
    analyzeMessage(message);

    try {
      if (tab === 'advisor') {
        const messageHistory = messages.advisor.map(msg => ({
          role: msg.author === 'user' ? 'user' : 'assistant',
          content: msg.type === 'text' ? msg.content : msg.content.speakableText
        }));
        
        const responseText = await processAdvisorMessage(message, messageHistory);
        await playNotificationSound();
        const newMessageId = addMessage('advisor', 'bot', 'text', { speakableText: responseText });
        
        if (isAutoResponseEnabled && responseText) {
          play(responseText, newMessageId);
        }

      } else if (tab === 'knowledge') {
        const responseText = await processKnowledgeMessage(message);
        await playNotificationSound();
        const newMessageId = addMessage('knowledge', 'bot', 'text', { speakableText: responseText });

        if (isAutoResponseEnabled && responseText) {
          play(responseText, newMessageId);
        }
        
      } else if (tab === 'banking') {
        // Dialogflow handles conversation, webhook handles data
        const data = await processBankingMessage({ 
          message, 
          user, 
          isAuthenticated, 
          onLoginRequired, 
          setPendingRequest 
        });
        
        await playNotificationSound();

        if (data.requiresAuth) {
          addMessage('banking', 'bot', 'structured', { speakableText: data.loginMessage });
        } else if (data.success) {
          const newMessageId = addMessage('banking', 'bot', 'structured', data.response);
          
          // Handle special actions
          if (data.response.action === 'AGENT_HANDOFF' && onAgentRequest) {
            onAgentRequest(messages.banking);
          }
          
          // Auto-play TTS
          if (isAutoResponseEnabled && data.response.speakableText) {
            play(data.response.speakableText, newMessageId);
          }
        }
      }
    } catch (error) {
      logger.error('Chat processing error', error);
      addMessage(tab, 'bot', 'structured', {
        speakableText: error.message || "Sorry, I encountered an error. Please try again."
      });
      await playNotificationSound();
    } finally {
      setLoading(false);
    }
  }, [
    addMessage, 
    messages, 
    user, 
    isAuthenticated, 
    onLoginRequired, 
    setPendingRequest, 
    playNotificationSound, 
    onAgentRequest, 
    isAutoResponseEnabled, 
    play, 
    analyzeMessage
  ]);

  return {
    messages,
    loading,
    processMessage
  };
}