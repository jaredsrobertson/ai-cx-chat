import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/hooks/useAuth';
import { useTTS } from '@/contexts/TTSContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { logger } from '@/lib/logger';
import { BOTS } from '@/lib/bots';

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

  if (!response.ok) {
    throw new Error('Failed to detect intent');
  }

  const result = await response.json();
  return result.data;
}

// This helper function parses the rich response we get back from Dialogflow
// after our webhook has processed the intent.
function formatDialogflowResponse(response) {
  const firstMessage = response.fulfillmentMessages?.[0];

  if (!firstMessage) {
    return { speakableText: response.fulfillmentText || "I'm sorry, I'm having trouble responding right now." };
  }

  // Check for the custom payload we designed in our webhook
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

async function processBankingMessage({ message, user, isAuthenticated, onLoginRequired, setPendingRequest }) {
    const sessionId = localStorage.getItem(`sessionId_${user?.id || 'guest'}`) || uuidv4();
    localStorage.setItem(`sessionId_${user?.id || 'guest'}`, sessionId);
    const token = localStorage.getItem('authToken');

    // 🚨 ADD THIS DEBUG LOGGING:
    console.log('processBankingMessage DEBUG:', {
        hasUser: !!user,
        isAuthenticated,
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        allTokens: Object.keys(localStorage).filter(k => k.includes('token'))
    });

    try {
        const dialogflowResponse = await detectDialogflowIntent(message, sessionId, token); 
        const responsePayload = formatDialogflowResponse(dialogflowResponse);

        if (responsePayload.action === 'AUTH_REQUIRED' && !isAuthenticated) {
            const loginMessage = getLoginMessage(responsePayload.intentName);
            const pending = { message, tab: 'banking', sessionId, intentName: responsePayload.intentName, timestamp: new Date() };
            setPendingRequest(pending);
            onLoginRequired();
            return { requiresAuth: true, loginMessage };
        }
        
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

const getLoginMessage = (intentName) => {
    const messages = {
      'account.balance': "Please log in to view your account balance. I'll show you the information right after you sign in.",
      'account.transfer': "Please log in to complete your transfer. I'll process your request right after you sign in.",
      'transaction.history': "Please log in to view your transaction history. I'll show you the information right after you sign in.",
    };
    return messages[intentName] || "For security, please log in to access your account information.";
};

export function useChat(activeBot, onLoginRequired, notificationAudioRef, onAgentRequest) {
  const [messages, setMessages] = useState({
    banking: [{ ...BOTS.banking.initialMessage }],
    advisor: [{ ...BOTS.advisor.initialMessage }],
    knowledge: [{ ...BOTS.knowledge.initialMessage }]
  });

  const [loading, setLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);

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
    const lastMessage = currentMessages[currentMessages.length - 1];

    if (lastMessage && lastMessage.author === 'bot' && proactiveCount.current < 2) {
      const delay = proactiveCount.current === 0 ? 20000 : 30000; // 20s then 30s
      
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

  // 🚨 CRITICAL FIX: Corrected authentication flow using the working pattern
  const processPendingRequest = useCallback(async (request) => {
    logger.debug('Processing pending request', { intent: request.intentName });

    try {
        const data = await processBankingMessage({
            message: request.message,
            user,
            isAuthenticated: true,
            onLoginRequired: () => {},
            setPendingRequest: () => {}
        });

        if (data.success) {
            const newMessageId = addMessage(request.tab, 'bot', 'structured', data.response);
            await playNotificationSound();
            
            if (data.response.action === 'AGENT_HANDOFF' && onAgentRequest) {
              onAgentRequest(messages.banking);
            }
            
            if (isAutoResponseEnabled && data.response.speakableText) {
              play(data.response.speakableText, newMessageId);
            }
            
            logger.debug('Pending request completed successfully');
        } else {
            throw new Error(data.error || "Pending request failed");
        }
    } catch (error) {
        logger.error('Error processing pending request', error);
        const msgId = addMessage(request.tab, 'bot', 'structured', { 
          speakableText: "I'm sorry, there was an issue processing your request after login. Please try again." 
        });
        await playNotificationSound();
        
        if (isAutoResponseEnabled) {
          play("I'm sorry, there was an issue processing your request after login. Please try again.", msgId);
        }
    }
  }, [addMessage, user, playNotificationSound, onAgentRequest, messages.banking, isAutoResponseEnabled, play]);

  // 🚨 CRITICAL FIX: Proper useEffect with correct dependencies and parameter passing
  useEffect(() => {
    if (isAuthenticated && pendingRequest) {
      logger.debug('Login detected. Processing pending request...');
      processPendingRequest(pendingRequest);
      setPendingRequest(null);
    }
  }, [isAuthenticated, pendingRequest, processPendingRequest]);

  const processMessage = useCallback(async (message, tab) => {
    clearTimeout(inactivityTimer.current);
    proactiveCount.current = 0; // Reset proactive counter on new user message

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
      } else {
        const data = await processBankingMessage({ message, user, isAuthenticated, onLoginRequired, setPendingRequest });
        await playNotificationSound();

        if (data.requiresAuth) {
            addMessage('banking', 'bot', 'structured', { speakableText: data.loginMessage });
        } else if (data.success) {
            const newMessageId = addMessage('banking', 'bot', 'structured', data.response);
            if (data.response.action === 'AGENT_HANDOFF' && onAgentRequest) {
              onAgentRequest(messages.banking);
            }
            if(isAutoResponseEnabled && data.response.speakableText){
                play(data.response.speakableText, newMessageId);
            }
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
  }, [addMessage, messages, user, isAuthenticated, onLoginRequired, setPendingRequest, playNotificationSound, onAgentRequest, isAutoResponseEnabled, play, analyzeMessage]);

  return {
    messages,
    loading,
    processMessage
  };
}