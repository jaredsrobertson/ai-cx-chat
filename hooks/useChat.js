import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/hooks/useAuth';
import { useTTS } from '@/contexts/TTSContext';
import { logger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

const { AUTH_REQUIRED_INTENTS, MESSAGES } = CONFIG;

/**
 * Handles the API call and logic for the financial-advisor bot.
 * @param {string} message - The user's input message.
 * @param {Array} messageHistory - The existing conversation history for the advisor tab.
 * @returns {Promise<string>} - A promise that resolves with the streamed text content.
 */
async function processAdvisorMessage(message, messageHistory) {
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

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let streamedContent = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    streamedContent += decoder.decode(value, { stream: true });
  }

  return streamedContent;
}

/**
 * Handles the API call and logic for the banking concierge bot.
 * @param {object} params - The parameters for processing the banking message.
 * @returns {Promise<object>} - A promise that resolves with the API response data.
 */
async function processBankingMessage({ message, user, isAuthenticated, onLoginRequired, setPendingRequest }) {
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
        const responsePayload = data.response;
        if (AUTH_REQUIRED_INTENTS.includes(responsePayload.intentName) && !isAuthenticated) {
            logger.warn('Authentication required for intent', { intent: responsePayload.intentName });
            const loginMessage = getLoginMessage(responsePayload.intentName);

            const pending = { message, tab: 'banking', sessionId: data.sessionId, intentName: responsePayload.intentName, timestamp: new Date() };
            setPendingRequest(pending);
            onLoginRequired();

            // Return a specific payload to signal that a login is required
            return { requiresAuth: true, loginMessage, sessionId: data.sessionId };
        }
        if (data.sessionId) {
            localStorage.setItem(`sessionId_${user?.id || 'guest'}`, data.sessionId);
        }
        return data;
    } else {
        throw new Error(data.error || "An unknown banking error occurred.");
    }
}

const getLoginMessage = (intentName) => {
    const messages = {
      'account.balance': "Please log in to view your account balance. I'll show you the information right after you sign in.",
      'account.transactions': "Please log in to view your transaction history. I'll show you the information right after you sign in.",
      'account.transfer': "Please log in to complete your transfer. I'll process your request right after you sign in.",
      'transaction.history': "Please log in to view your transaction history. I'll show you the information right after you sign in.",
    };
    return messages[intentName] || "For security, please log in to access your account information.";
};

export function useChat(initialTab, onLoginRequired, notificationAudioRef) {
  const [messages, setMessages] = useState({
    banking: [{ ...MESSAGES.INITIAL.BANKING, id: uuidv4(), timestamp: new Date() }],
    advisor: [{ ...MESSAGES.INITIAL.ADVISOR, id: uuidv4(), timestamp: new Date() }]
  });

  const [loading, setLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);

  const { isAuthenticated, user } = useAuth();
  const { play, isAutoResponseEnabled, isNotificationEnabled } = useTTS();

  const playNotificationSound = useCallback(() => {
    if (isNotificationEnabled && notificationAudioRef.current) {
      notificationAudioRef.current.volume = 0.5; // Set volume to 50%
      notificationAudioRef.current.play().catch(e => logger.error("Error playing notification sound", e));
      return new Promise(resolve => setTimeout(resolve, 500));
    }
    return Promise.resolve();
  }, [isNotificationEnabled, notificationAudioRef]);

  const addMessage = useCallback((tab, author, type, content, id = uuidv4()) => {
    setMessages(prev => ({ ...prev, [tab]: [...prev[tab], { id, author, type, content, timestamp: new Date() }] }));
  }, []);

  const updateMessageContent = useCallback((tab, messageId, newContent) => {
    setMessages(prev => ({
      ...prev,
      [tab]: prev[tab].map(msg => msg.id === messageId ? { ...msg, content: newContent } : msg),
    }));
  }, []);

  const processPendingRequest = useCallback(async (request) => {
    logger.debug('Processing pending request', { intent: request.intentName });

    try {
        const data = await processBankingMessage({
            message: request.message,
            user,
            isAuthenticated: true,
            onLoginRequired: () => {}, // Should not be called here
            setPendingRequest: () => {} // Should not be called here
        });

        if (data.success) {
            addMessage(request.tab, 'bot', 'structured', data.response);
            await playNotificationSound();
            logger.debug('Pending request completed successfully');
        } else {
            throw new Error(data.error || "Pending request failed");
        }
    } catch (error) {
        logger.error('Error processing pending request', error);
        addMessage(request.tab, 'bot', 'structured', { speakableText: "I'm sorry, there was an issue processing your request after login. Please try again." });
        await playNotificationSound();
    }
  }, [addMessage, user, playNotificationSound]);

  useEffect(() => {
    if (isAuthenticated && pendingRequest) {
      logger.debug('Login detected. Processing pending request...');
      processPendingRequest(pendingRequest);
      setPendingRequest(null);
    }
  }, [isAuthenticated, pendingRequest, processPendingRequest]);

  const processAdvisorMessageHelper = useCallback(async (message) => {
    const messageHistory = messages.advisor.map(msg => ({
      role: msg.author === 'user' ? 'user' : 'assistant',
      content: msg.type === 'text' ? msg.content : msg.content.speakableText
    }));

    const placeholderId = uuidv4();
    addMessage('advisor', 'bot', 'text', '...', placeholderId);

    const streamedContent = await processAdvisorMessage(message, messageHistory);

    updateMessageContent('advisor', placeholderId, { speakableText: streamedContent });
    await playNotificationSound();

    if (isAutoResponseEnabled && streamedContent) {
      play(streamedContent, placeholderId);
    }
  }, [messages.advisor, addMessage, updateMessageContent, playNotificationSound, isAutoResponseEnabled, play]);

  const processBankingMessageHelper = useCallback(async (message) => {
    const data = await processBankingMessage({ message, user, isAuthenticated, onLoginRequired, setPendingRequest });

    if (data.requiresAuth) {
        addMessage('banking', 'bot', 'structured', { speakableText: data.loginMessage });
        await playNotificationSound();
    } else if (data.success) {
        addMessage('banking', 'bot', 'structured', data.response);
        await playNotificationSound();
    }
  }, [user, isAuthenticated, onLoginRequired, setPendingRequest, addMessage, playNotificationSound]);

  const processMessage = useCallback(async (message, tab) => {
    setLoading(true);
    addMessage(tab, 'user', 'text', message);

    try {
      if (tab === 'advisor') {
        await processAdvisorMessageHelper(message);
      } else { // Banking
        await processBankingMessageHelper(message);
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
  }, [addMessage, playNotificationSound, processAdvisorMessageHelper, processBankingMessageHelper]);

  return {
    messages,
    loading,
    processMessage
  };
}