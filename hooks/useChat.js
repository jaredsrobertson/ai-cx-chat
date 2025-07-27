import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/hooks/useAuth';
import { useTTS } from '@/contexts/TTSContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { logger } from '@/lib/logger';
import { BOTS } from '@/lib/bots';
import { CONFIG } from '@/lib/config';

// Debounce function
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

function needsAuth(intentName) {
  return CONFIG.AUTH_REQUIRED_INTENTS.includes(intentName);
}

async function quickClassifyIntent(message) {
  const msg = message.toLowerCase().trim();
  for (const keyword in CONFIG.INTENT_CLASSIFICATION) {
    if (msg.includes(keyword)) {
      return CONFIG.INTENT_CLASSIFICATION[keyword];
    }
  }
  return 'general';
}

function structToJson(struct) {
  if (!struct || !struct.fields) {
    return struct;
  }
  const json = {};
  for (const key in struct.fields) {
    const field = struct.fields[key];
    const valueType = Object.keys(field)[0];
    let value = field[valueType];

    if (valueType === 'structValue') {
      value = structToJson(value);
    } else if (valueType === 'listValue') {
      value = value.values.map(item => structToJson({ fields: { item } }).item);
    }
    json[key] = value;
  }
  return json;
}

async function detectDialogflowIntent(message, sessionId, token) {
  const response = await fetch('/api/dialogflow/detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId, token }),
  });
  if (!response.ok) throw new Error('Failed to detect intent');
  return (await response.json()).data;
}

function formatDialogflowResponse(response) {
  const firstMessage = response.fulfillmentMessages?.[0];

  if (!firstMessage) {
    return { speakableText: response.fulfillmentText || "I'm sorry, I'm having trouble responding right now." };
  }

  if (firstMessage.payload && firstMessage.payload.fields) {
    const customPayload = structToJson(firstMessage.payload);
    return {
      speakableText: customPayload.speakableText || response.fulfillmentText,
      action: customPayload.action,
      intentName: customPayload.intentName || response.intent?.displayName,
      confidentialData: customPayload.confidentialData,
    };
  }

  return { 
    speakableText: firstMessage.text?.text?.[0] || response.fulfillmentText,
    intentName: response.intent?.displayName,
  };
}

async function processBankingMessage({ message, user, sessionId }) {
  const token = localStorage.getItem('authToken');

  try {
    const dialogflowResponse = await detectDialogflowIntent(message, sessionId, token);
    const responsePayload = formatDialogflowResponse(dialogflowResponse);
    return { success: true, response: responsePayload };
  } catch (error) {
    logger.error('Banking message processing failed', error);
    throw new Error("I'm having trouble connecting to my services. Please try again.");
  }
}

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

const initialMessages = {
  banking: [{ ...BOTS.banking.initialMessage }],
  advisor: [{ ...BOTS.advisor.initialMessage }],
  knowledge: [{ ...BOTS.knowledge.initialMessage }]
};

export function useChat(activeBot, onLoginRequired, notificationAudioRef, onAgentRequest) {
  const [messages, setMessages] = useState(initialMessages);
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);

  const { isAuthenticated, user } = useAuth();
  const { play, isAutoResponseEnabled, isNotificationEnabled } = useTTS();
  const { addAnalyticsEntry } = useAnalytics();
  const inactivityTimer = useRef(null);
  const proactiveCount = useRef(0);
  
  const debouncedSaveMessages = useCallback(debounce((msgs) => {
    try {
      localStorage.setItem('chatMessages', JSON.stringify(msgs));
    } catch (error) {
      logger.error("Failed to save messages to localStorage", error);
    }
  }, 500), []);

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
    debouncedSaveMessages(messages);
  }, [messages, debouncedSaveMessages]);
  
  useEffect(() => {
    clearTimeout(inactivityTimer.current);

    const currentMessages = messages[activeBot] || [];
    const lastMsg = currentMessages[currentMessages.length - 1];

    if (lastMsg && lastMsg.author === 'bot' && proactiveCount.current < 2) {
      const delay = proactiveCount.current === 0 ? 20000 : 30000;
      
      inactivityTimer.current = setTimeout(() => {
        addMessage(activeBot, 'bot', 'text', { speakableText: "Is there anything else I can help you with today?" });
        proactiveCount.current += 1;
      }, delay);
    }

    return () => clearTimeout(inactivityTimer.current);
  }, [messages, activeBot]);

  const playNotificationSound = useCallback(async () => {
    if (isNotificationEnabled && notificationAudioRef.current) {
      notificationAudioRef.current.volume = 0.5;
      await notificationAudioRef.current.play().catch(e => logger.error("Error playing notification sound", e));
    }
  }, [isNotificationEnabled, notificationAudioRef]);

  const addMessage = useCallback((tab, author, type, content, id = uuidv4()) => {
    setMessages(prev => {
      const newMessages = { ...prev };
      newMessages[tab] = [...(newMessages[tab] || []), { id, author, type, content, timestamp: new Date() }];
      return newMessages;
    });
    return id;
  }, []);
  
  const analyzeMessage = useCallback(async (message) => {
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
  }, [addAnalyticsEntry]);

  const retryLastMessage = useCallback(async () => {
    if (pendingMessage && isAuthenticated) {
      const { message, tab } = pendingMessage;
      setPendingMessage(null);
      setLoading(true);

      try {
        if (tab === 'banking') {
          const sessionId = localStorage.getItem(`sessionId_${user?.id || 'guest'}`) || uuidv4();
          localStorage.setItem(`sessionId_${user?.id || 'guest'}`, sessionId);

          const data = await processBankingMessage({ message, user, sessionId });
          await playNotificationSound();

          if (data.success) {
            const newMessageId = addMessage('banking', 'bot', 'structured', data.response);
            
            if (data.response.action === 'AGENT_HANDOFF' && onAgentRequest) {
              onAgentRequest(messages.banking);
            }
            
            if (isAutoResponseEnabled && data.response.speakableText) {
              play(data.response.speakableText, newMessageId);
            }
          }
        }
      } catch (error) {
        logger.error('Retry processing error', error);
        const msgId = addMessage(tab, 'bot', 'structured', {
          speakableText: error.message || "Sorry, I encountered an error. Please try again."
        });
        await playNotificationSound();
        
        if (isAutoResponseEnabled) {
          play(error.message || "Sorry, I encountered an error. Please try again.", msgId);
        }
      } finally {
        setLoading(false);
      }
    }
  }, [pendingMessage, isAuthenticated, user, addMessage, playNotificationSound, onAgentRequest, isAutoResponseEnabled, play, messages.banking]);

  const handleMessage = useCallback(async (message, tab) => {
    clearTimeout(inactivityTimer.current);
    proactiveCount.current = 0;

    addMessage(tab, 'user', 'text', message);
    setLoading(true);
    analyzeMessage(message);

    try {
      if (tab === 'banking') {
        const classifiedIntent = await quickClassifyIntent(message);
        
        if (needsAuth(classifiedIntent) && !isAuthenticated) {
          setPendingMessage({ message, tab });
          
          addMessage('banking', 'bot', 'structured', { 
            speakableText: "Please log in to view your account information. I'll process your request right after you sign in." 
          });
          
          await playNotificationSound();
          onLoginRequired();
          setLoading(false); // Stop loading while waiting for login
          return;
        }

        const sessionId = localStorage.getItem(`sessionId_${user?.id || 'guest'}`) || uuidv4();
        localStorage.setItem(`sessionId_${user?.id || 'guest'}`, sessionId);

        const data = await processBankingMessage({ message, user, sessionId });
        await playNotificationSound();

        if (data.success) {
          const newMessageId = addMessage('banking', 'bot', 'structured', data.response);
          
          if (data.response.action === 'AGENT_HANDOFF' && onAgentRequest) {
            onAgentRequest(messages.banking);
          }
          
          if (isAutoResponseEnabled && data.response.speakableText) {
            play(data.response.speakableText, newMessageId);
          }
        }

      } else if (tab === 'advisor') {
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
      }

    } catch (error) {
      logger.error('Chat processing error', error);
      const msgId = addMessage(tab, 'bot', 'structured', {
        speakableText: error.message || "Sorry, I encountered an error. Please try again."
      });
      await playNotificationSound();
      
      if (isAutoResponseEnabled) {
        play(error.message || "Sorry, I encountered an error. Please try again.", msgId);
      }
    } finally {
      setLoading(false);
    }
  }, [addMessage, messages, user, isAuthenticated, onLoginRequired, playNotificationSound, onAgentRequest, isAutoResponseEnabled, play, analyzeMessage]);

  return {
    messages,
    loading,
    processMessage: handleMessage,
    retryLastMessage
  };
}