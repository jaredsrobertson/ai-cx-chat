// hooks/useChat.js
import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/hooks/useAuth';
import { useTTS } from '@/contexts/TTSContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { logger } from '@/lib/logger';
import { BOTS } from '@/lib/bots';

// Dialogflow integration
async function detectDialogflowIntent(message, sessionId, token) {
  const response = await fetch('/api/dialogflow/detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId, token }),
  });
  if (!response.ok) throw new Error('Failed to communicate with Dialogflow');
  return (await response.json()).data;
}

// Format Dialogflow response
function formatDialogflowResponse(response) {
  const speakableText = response.fulfillmentText || "I'm having trouble right now. Please try again.";
  const customPayload = response.fulfillmentMessages?.find(msg => msg.payload)?.payload;

  if (customPayload) {
    const responseData = {
      speakableText: customPayload.authMessage || speakableText,
      action: customPayload.action,
      intentName: customPayload.intentName || response.intent?.displayName,
      confidentialData: customPayload.confidentialData,
    };
    return responseData;
  }
  return { speakableText, intentName: response.intent?.displayName };
}

// Banking message processor
async function processBankingMessage({ message, user, isAuthenticated, onLoginRequired, setPendingRequest }) {
  const sessionId = localStorage.getItem(`sessionId_${user?.id || 'guest'}`) || uuidv4();
  localStorage.setItem(`sessionId_${user?.id || 'guest'}`, sessionId);
  const token = localStorage.getItem('authToken');

  try {
    const dialogflowResponse = await detectDialogflowIntent(message, sessionId, token);
    const responsePayload = formatDialogflowResponse(dialogflowResponse);

    if (responsePayload.action === 'AUTH_REQUIRED' && !isAuthenticated) {
      setPendingRequest({ message, tab: 'banking', sessionId, intentName: responsePayload.intentName, timestamp: new Date() });
      onLoginRequired();
      return { requiresAuth: true, loginMessage: responsePayload.speakableText };
    }
    return { success: true, response: responsePayload };
  } catch (error) {
    logger.error('Banking message processing failed', error);
    throw new Error("I'm having trouble connecting to my services. Please try again.");
  }
}

// Advisor message processor
async function processAdvisorMessage(message, messageHistory) {
  const response = await fetch('/api/chat/financial-advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [...messageHistory, { role: 'user', content: message }] })
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Failed to fetch advisor response');
  return response.text();
}

// Knowledge base message processor
async function processKnowledgeMessage(message) {
  const response = await fetch('/api/chat/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Failed to fetch knowledge base response');
  return response.text();
}

const initialMessages = {
  banking: [BOTS.banking.initialMessage],
  advisor: [BOTS.advisor.initialMessage],
  knowledge: [BOTS.knowledge.initialMessage],
};

export function useChat(activeTab, onLoginRequired, notificationAudioRef, onAgentRequest) {
  const [messages, setMessages] = useState(initialMessages);
  const [loading, setLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);

  const { isAuthenticated, user } = useAuth();
  const { play, isAutoResponseEnabled, isNotificationEnabled } = useTTS();
  const { addAnalyticsEntry } = useAnalytics();
  const inactivityTimer = useRef(null);
  const proactiveCount = useRef(0);

  // Load and save messages from/to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chatMessages');
      if (saved) setMessages(JSON.parse(saved));
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

  // Proactive engagement timer
  useEffect(() => {
    clearTimeout(inactivityTimer.current);
    const currentMessages = messages[activeTab] || [];
    const lastMessage = currentMessages[currentMessages.length - 1];

    if (lastMessage?.author === 'bot' && proactiveCount.current < 2) {
      inactivityTimer.current = setTimeout(() => {
        addMessage(activeTab, 'bot', 'text', { speakableText: "Is there anything else I can help you with today?" });
        proactiveCount.current += 1;
      }, proactiveCount.current === 0 ? 20000 : 30000);
    }
    return () => clearTimeout(inactivityTimer.current);
  }, [messages, activeTab]);

  const playNotificationSound = useCallback(async () => {
    if (isNotificationEnabled && notificationAudioRef.current) {
      notificationAudioRef.current.volume = 0.5;
      await notificationAudioRef.current.play().catch(e => logger.error("Error playing notification sound", e));
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, [isNotificationEnabled, notificationAudioRef]);

  const addMessage = useCallback((tab, author, type, content, id = uuidv4()) => {
    setMessages(prev => ({
      ...prev,
      [tab]: [...(prev[tab] || []), { id, author, type, content, timestamp: new Date() }],
    }));
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
        if (analysis.intent && analysis.sentiment) {
          addAnalyticsEntry({ message, ...analysis });
        }
      }
    } catch (error) {
      logger.error('Failed to analyze message', error);
    }
  };

  const processPendingRequest = useCallback(async (request) => {
    try {
      const data = await processBankingMessage({
        message: request.message,
        user,
        isAuthenticated: true,
        onLoginRequired: () => {},
        setPendingRequest: () => {}
      });

      if (data.success) {
        const newId = addMessage(request.tab, 'bot', 'structured', data.response);
        await playNotificationSound();
        if (data.response.action === 'AGENT_HANDOFF' && onAgentRequest) onAgentRequest(messages.banking);
        if (isAutoResponseEnabled && data.response.speakableText) play(data.response.speakableText, newId);
      }
    } catch (error) {
      logger.error('Error processing pending request', error);
      addMessage(request.tab, 'bot', 'structured', { speakableText: "I'm sorry, there was an issue processing your request after login. Please try again." });
      await playNotificationSound();
    }
  }, [addMessage, user, playNotificationSound, onAgentRequest, messages.banking, isAutoResponseEnabled, play]);

  useEffect(() => {
    if (isAuthenticated && pendingRequest) {
      processPendingRequest(pendingRequest);
      setPendingRequest(null);
    }
  }, [isAuthenticated, pendingRequest, processPendingRequest]);

  const processMessage = useCallback(async (message, tab) => {
    clearTimeout(inactivityTimer.current);
    proactiveCount.current = 0;
    addMessage(tab, 'user', 'text', message);
    setLoading(true);
    analyzeMessage(message);

    try {
      let responseText, data, newId;
      await playNotificationSound();

      if (tab === 'banking') {
        data = await processBankingMessage({ message, user, isAuthenticated, onLoginRequired, setPendingRequest });
        if (data.requiresAuth) {
          addMessage('banking', 'bot', 'structured', { speakableText: data.loginMessage });
        } else if (data.success) {
          newId = addMessage('banking', 'bot', 'structured', data.response);
          if (data.response.action === 'AGENT_HANDOFF' && onAgentRequest) onAgentRequest(messages.banking);
          if (isAutoResponseEnabled && data.response.speakableText) play(data.response.speakableText, newId);
        }
      } else {
        const messageHistory = messages[tab].map(msg => ({
          role: msg.author === 'user' ? 'user' : 'assistant',
          content: msg.type === 'text' ? msg.content : msg.content.speakableText
        }));

        responseText = tab === 'advisor'
          ? await processAdvisorMessage(message, messageHistory)
          : await processKnowledgeMessage(message);

        newId = addMessage(tab, 'bot', 'text', { speakableText: responseText });
        if (isAutoResponseEnabled && responseText) play(responseText, newId);
      }
    } catch (error) {
      logger.error('Chat processing error', error);
      addMessage(tab, 'bot', 'structured', { speakableText: error.message || "Sorry, I encountered an error. Please try again." });
      await playNotificationSound();
    } finally {
      setLoading(false);
    }
  }, [addMessage, messages, user, isAuthenticated, onLoginRequired, playNotificationSound, onAgentRequest, isAutoResponseEnabled, play, analyzeMessage]);

  return { messages, loading, processMessage };
}