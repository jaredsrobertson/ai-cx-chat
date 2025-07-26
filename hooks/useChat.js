import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/hooks/useAuth';
import { useTTS } from '@/contexts/TTSContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { logger } from '@/lib/logger';
import { BOTS } from '@/lib/bots';

// --- Auth Configuration ---
const AUTH_REQUIRED_INTENTS = [
  'account.balance',
  'account.transfer', 
  'account.transfer - yes',
  'transaction.history'
];

function needsAuth(intentName) {
  return AUTH_REQUIRED_INTENTS.includes(intentName);
}

// --- Quick Intent Classification ---
async function quickClassifyIntent(message) {
  // Simple keyword-based classification for common banking intents
  const msg = message.toLowerCase().trim();
  
  // Balance-related keywords
  if (msg.includes('balance') || msg.includes('money') || msg.includes('account')) {
    return 'account.balance';
  }
  
  // Transfer-related keywords  
  if (msg.includes('transfer') || msg.includes('move') || msg.includes('send')) {
    return 'account.transfer';
  }
  
  // Transaction-related keywords
  if (msg.includes('transaction') || msg.includes('history') || msg.includes('recent')) {
    return 'transaction.history';
  }
  
  // Agent-related keywords
  if (msg.includes('agent') || msg.includes('human') || msg.includes('person')) {
    return 'agent.handoff';
  }
  
  // Default - no auth required
  return 'general';
}

// Helper to convert Dialogflow's Struct format to a plain JSON object
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

  // Check for the custom payload with fields structure
  if (firstMessage.payload && firstMessage.payload.fields) {
    const fields = firstMessage.payload.fields;
    const responseData = {
      speakableText: fields.speakableText?.stringValue || response.fulfillmentText,
      action: fields.action?.stringValue,
      intentName: fields.intentName?.stringValue || response.intent?.displayName,
    };
    
    // Unpack the confidentialData struct if it exists
    const confidentialData = fields.confidentialData?.structValue?.fields;
    if (confidentialData) {
      const formattedData = {};
      formattedData.type = confidentialData.type?.stringValue;

      if (confidentialData.accounts) {
        formattedData.accounts = confidentialData.accounts.listValue.values.map(v => ({
          name: v.structValue.fields.name.stringValue,
          balance: v.structValue.fields.balance.numberValue,
        }));
      }
      if (confidentialData.transactions) {
        formattedData.transactions = confidentialData.transactions.listValue.values.map(v => ({
          date: v.structValue.fields.date.stringValue,
          description: v.structValue.fields.description.stringValue,
          amount: v.structValue.fields.amount.numberValue,
        }));
      }
      if (confidentialData.details) {
        const detailsFields = confidentialData.details.structValue.fields;
        formattedData.details = {
          amount: detailsFields.amount.numberValue,
          fromAccount: detailsFields.fromAccount.stringValue,
          toAccount: detailsFields.toAccount.stringValue,
        };
      }
      responseData.confidentialData = formattedData;
    }
    return responseData;
  }

  // Check for simple payload format (without fields wrapper)
  if (firstMessage.payload && !firstMessage.payload.fields) {
    const customPayload = structToJson(firstMessage.payload);
    if (customPayload) {
      return {
        speakableText: customPayload.authMessage || response.fulfillmentText,
        action: customPayload.action,
        intentName: customPayload.intentName || response.intent?.displayName,
        confidentialData: customPayload.confidentialData,
      };
    }
  }

  // Fallback to a standard text response
  return { 
    speakableText: firstMessage.text?.text?.[0] || response.fulfillmentText,
    intentName: response.intent?.displayName,
  };
}

// --- Streamlined Banking Message Processing ---
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
  const [lastMessage, setLastMessage] = useState(null); // Store last message for retry after login

  const { isAuthenticated, user } = useAuth();
  const { play, isAutoResponseEnabled, isNotificationEnabled } = useTTS();
  const { addAnalyticsEntry } = useAnalytics();
  const inactivityTimer = useRef(null);
  const proactiveCount = useRef(0);

  // Load messages from localStorage on initial render
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

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    } catch (error) {
      logger.error("Failed to save messages to localStorage", error);
    }
  }, [messages]);
  
  // Proactive engagement timer
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
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
        const analysis = JSON.parse(result);
        if(analysis.intent && analysis.sentiment) {
          addAnalyticsEntry({ message, ...analysis });
        }
      }
    } catch (error) {
      logger.error('Failed to analyze message', error);
    }
  }, [addAnalyticsEntry]);

  // 🚨 FIXED: Retry last message function - now manually triggered only
  const retryLastMessage = useCallback(async () => {
    if (lastMessage && isAuthenticated) {
      logger.debug('Retrying last message after login', { message: lastMessage.message, tab: lastMessage.tab });
      setLastMessage(null); // Clear the stored message
      await handleMessage(lastMessage.message, lastMessage.tab);
    }
  }, [lastMessage, isAuthenticated]);

  // 🚨 STREAMLINED: Front-loaded auth check with single Dialogflow call
  const handleMessage = useCallback(async (message, tab) => {
    clearTimeout(inactivityTimer.current);
    proactiveCount.current = 0;

    addMessage(tab, 'user', 'text', message);
    setLoading(true);
    analyzeMessage(message);

    try {
      if (tab === 'banking') {
        // 🎯 FRONT-LOADED AUTH CHECK
        const classifiedIntent = await quickClassifyIntent(message);
        
        if (needsAuth(classifiedIntent) && !isAuthenticated) {
          logger.debug('Auth required for classified intent', { classifiedIntent, message });
          
          // Store message for retry after login
          setLastMessage({ message, tab });
          
          // Show login prompt immediately
          addMessage('banking', 'bot', 'structured', { 
            speakableText: "Please log in to view your account information. I'll process your request right after you sign in." 
          });
          
          await playNotificationSound();
          onLoginRequired();
          return;
        }

        // 🎯 SINGLE AUTHENTICATED DIALOGFLOW CALL
        const sessionId = localStorage.getItem(`sessionId_${user?.id || 'guest'}`) || uuidv4();
        localStorage.setItem(`sessionId_${user?.id || 'guest'}`, sessionId);

        const data = await processBankingMessage({ message, user, sessionId });
        await playNotificationSound();

        if (data.success) {
          const newMessageId = addMessage('banking', 'bot', 'structured', data.response);
          
          // 🚨 DEBUG: Log the response structure
          logger.debug('Banking response data:', {
            hasConfidentialData: !!data.response.confidentialData,
            confidentialDataType: data.response.confidentialData?.type,
            fullResponse: JSON.stringify(data.response, null, 2)
          });
          
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
    processMessage: handleMessage, // Renamed for clarity
    retryLastMessage // Expose for ChatWidget
  };
}