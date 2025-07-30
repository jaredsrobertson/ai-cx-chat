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

  const addMessage = useCallback((tab, author, type, content, id = uuidv4()) => {
    setMessages(prev => {
      const newMessages = { ...prev };
      newMessages[tab] = [...(newMessages[tab] || []), { id, author, type, content, timestamp: new Date() }];
      return newMessages;
    });
    return id;
  }, []);

  const playNotificationSound = useCallback(async () => {
    if (isNotificationEnabled && notificationAudioRef.current) {
      notificationAudioRef.current.volume = 0.5;
      await notificationAudioRef.current.play().catch(e => logger.error("Error playing notification sound", e));
    }
  }, [isNotificationEnabled, notificationAudioRef]);

  const _playBotResponse = useCallback((text, id) => {
    if (isAutoResponseEnabled && text) {
      play(text, id);
    }
  }, [isAutoResponseEnabled, play]);

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

  const _handleBankingMessage = async (message) => {
    const classifiedIntent = await quickClassifyIntent(message);
    if (needsAuth(classifiedIntent) && !isAuthenticated) {
      setPendingMessage({ message, tab: 'banking' });
      const msgId = addMessage('banking', 'bot', 'structured', { speakableText: "Please log in to continue. I'll process your request right after." });
      await playNotificationSound();
      _playBotResponse("Please log in to continue. I'll process your request right after.", msgId);
      onLoginRequired();
      return; // Stop processing until login
    }

    const sessionId = localStorage.getItem(`sessionId_${user?.id || 'guest'}`) || uuidv4();
    localStorage.setItem(`sessionId_${user?.id || 'guest'}`, sessionId);
    const token = localStorage.getItem('authToken');

    const response = await fetch('/api/dialogflow/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId, token }),
    });

    if (!response.ok) throw new Error(CONFIG.MESSAGES.ERRORS.DIALOGFLOW_ERROR);
    
    const dialogflowData = (await response.json()).data;
    const responsePayload = formatDialogflowResponse(dialogflowData);
    
    await playNotificationSound();
    const newMessageId = addMessage('banking', 'bot', 'structured', responsePayload);
    _playBotResponse(responsePayload.speakableText, newMessageId);

    if (responsePayload.action === 'AGENT_HANDOFF' && onAgentRequest) {
      onAgentRequest(messages.banking);
    }
  };

  const _handleAdvisorMessage = async (message) => {
    const messageHistory = messages.advisor.map(msg => ({
      role: msg.author === 'user' ? 'user' : 'assistant',
      content: (typeof msg.content === 'object' && msg.content !== null) ? msg.content.speakableText : msg.content
    }));

    const response = await fetch('/api/chat/financial-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...messageHistory, { role: 'user', content: message }] })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || CONFIG.MESSAGES.ERRORS.ADVISOR_ERROR);
    }

    const responseText = await response.text();
    await playNotificationSound();
    const newMessageId = addMessage('advisor', 'bot', 'text', { speakableText: responseText });
    _playBotResponse(responseText, newMessageId);
  };
  
  const _handleKnowledgeMessage = async (message) => {
      const response = await fetch('/api/chat/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, messages: messages.knowledge })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get knowledge base response.');
      }
      
      const responseText = await response.text();
      await playNotificationSound();
      const newMessageId = addMessage('knowledge', 'bot', 'text', { speakableText: responseText });
      _playBotResponse(responseText, newMessageId);
  };

  const processMessage = useCallback(async (message, tab) => {
    clearTimeout(inactivityTimer.current);
    proactiveCount.current = 0;
    
    addMessage(tab, 'user', 'text', message);
    setLoading(true);
    analyzeMessage(message);
    
    try {
      if (tab === 'banking') await _handleBankingMessage(message);
      else if (tab === 'advisor') await _handleAdvisorMessage(message);
      else if (tab === 'knowledge') await _handleKnowledgeMessage(message);

    } catch (error) {
      logger.error(`Chat processing error in tab: ${tab}`, error);
      const msgId = addMessage(tab, 'bot', 'structured', {
        speakableText: error.message || CONFIG.MESSAGES.ERRORS.SERVER_ERROR
      });
      await playNotificationSound();
      _playBotResponse(error.message, msgId);
    } finally {
      setLoading(false);
    }
  }, [addMessage, messages, user, isAuthenticated, onLoginRequired, playNotificationSound, onAgentRequest, _playBotResponse, analyzeMessage]);

  const retryLastMessage = useCallback(async () => {
    if (pendingMessage && isAuthenticated) {
      const { message, tab } = pendingMessage;
      setPendingMessage(null); // Clear pending message immediately
      setLoading(true);

      try {
        if (tab === 'banking') {
          await _handleBankingMessage(message);
        }
        // Add retry logic for other tabs if needed
      } catch (error) {
        logger.error('Retry processing error', error);
        const msgId = addMessage(tab, 'bot', 'structured', {
          speakableText: error.message || CONFIG.MESSAGES.ERRORS.SERVER_ERROR
        });
        await playNotificationSound();
        _playBotResponse(error.message, msgId);
      } finally {
        setLoading(false);
      }
    }
  }, [pendingMessage, isAuthenticated, addMessage, playNotificationSound, _playBotResponse]);

  return {
    messages,
    loading,
    processMessage,
    retryLastMessage
  };
}