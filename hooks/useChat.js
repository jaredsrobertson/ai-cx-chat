import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './useAuth';

export function useChat(initialTab, onLoginRequired) {
  const [messages, setMessages] = useState({
    banking: [{ 
      id: uuidv4(), 
      author: 'bot', 
      type: 'structured', 
      content: { speakableText: "Welcome to the SecureBank Concierge. I can help you with account balances, transaction history, and fund transfers. I can also provide branch hours. If you need more help, just ask to speak with a live agent. How can I assist you today?" },
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

  const addMessage = useCallback((tab, author, type, content) => {
    const fallbackText = "I'm sorry, I didn't quite understand.";
    const agentOfferText = "It seems I'm still having trouble. Would you like to speak with a live agent?";

    setMessages(prev => {
      let newMessagesForTab = [...prev[tab], { 
        id: uuidv4(), 
        author, 
        type, 
        content, 
        timestamp: new Date() 
      }];

      if (author === 'bot' && content.speakableText) {
        if (content.speakableText.startsWith(fallbackText)) {
          fallbackCount.current += 1;
        } else {
          fallbackCount.current = 0;
        }

        if (fallbackCount.current >= 2) {
          newMessagesForTab.push({ 
            id: uuidv4(), 
            author: 'bot', 
            type: 'structured', 
            content: { speakableText: agentOfferText }, 
            timestamp: new Date() 
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
        addMessage(tab, 'bot', 'text', '...');

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          streamedContent += decoder.decode(value, { stream: true });
          updateMessageContent(tab, placeholderId, { speakableText: streamedContent });
        }

      } else { // Banking Bot
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
          const intentsRequiringAuth = ['account.balance', 'account.transfer', 'account.transactions', 'account.transfer - yes'];
          
          if (intentsRequiringAuth.includes(responsePayload.intentName) && !isAuthenticated) {
            onLoginRequired();
            setPendingRequest({ message, tab });
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
  }, [isAuthenticated, user, messages, onLoginRequired, addMessage, updateMessageContent]);

  useEffect(() => {
    if (isAuthenticated && pendingRequest) {
      processMessage(pendingRequest.message, pendingRequest.tab);
      setPendingRequest(null);
    }
  }, [isAuthenticated, pendingRequest, processMessage]);

  return { messages, loading, processMessage, activeTab, setActiveTab };
}