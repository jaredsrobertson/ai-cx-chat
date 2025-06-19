import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { speakText } from '../lib/tts';

export function useChat(activeTab, onLoginRequired, isTtsEnabled) {
  const [messages, setMessages] = useState({
    banking: [{ id: 1, text: "Welcome to the SecureBank Concierge. I can help with account tasks like checking balances or making transfers. How can I assist?", sender: 'bot', timestamp: new Date() }],
    advisor: [{ id: 1, text: "Welcome to the AI Advisor. I can help with financial planning, budgeting, and investment questions. What's on your mind?", sender: 'bot', timestamp: new Date() }]
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [sessionIds, setSessionIds] = useState({ banking: null, advisor: null });
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && pendingRequest) {
      handleSendMessage(pendingRequest, true);
    }
  }, [isAuthenticated, pendingRequest]);

  // Updated addMessage to be more robust
  const addMessage = (data, sender, id = null) => {
    const messageId = id || Date.now() + Math.random();
    
    let textContent = '';
    let confidentialContent = null;

    // Check if the data is a structured object from our API
    if (typeof data === 'object' && data !== null && data.hasOwnProperty('speakableText')) {
        textContent = data.speakableText;
        confidentialContent = data.confidentialData || null;
    } else {
        // Fallback for simple strings (like user messages)
        textContent = data;
    }

    const message = {
      id: messageId,
      text: textContent,
      confidentialData: confidentialContent,
      sender,
      timestamp: new Date()
    };

    setMessages(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], message]
    }));
    
    if (sender === 'bot' && isTtsEnabled && textContent) {
      speakText(textContent);
    }
    return messageId;
  };
  
  const updateMessageContent = (id, newContent) => {
    setMessages(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(msg => msg.id === id ? { ...msg, text: newContent } : msg)
    }));
  };

  const processMessage = async (messageToProcess) => {
    const messageHistory = messages[activeTab].slice(1).map(msg => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text }));
    messageHistory.push(messageToProcess);

    setTimeout(async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'advisor') {
          const response = await fetch('/api/chat/financial-advisor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageHistory }) });
          setIsLoading(false);
          const messageId = addMessage({ speakableText: "" }, 'bot');
          let fullText = "";
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  if (data.content) {
                    fullText += data.content;
                    updateMessageContent(messageId, fullText);
                  }
                } catch (e) { console.error("Failed to parse stream data chunk:", line) }
              }
            }
          }
          if (isTtsEnabled && fullText) {
            setTimeout(() => { speakText(fullText); }, 300);
          }
        } else {
          const token = localStorage.getItem('authToken');
          const response = await fetch('/api/chat/banking', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }, body: JSON.stringify({ message: messageToProcess.content, sessionId: sessionIds[activeTab] }) });
          setIsLoading(false);
          const data = await response.json();
          if (data.sessionId) { setSessionIds(prev => ({ ...prev, [activeTab]: data.sessionId })); }
          addMessage(data.response, 'bot');
        }
      } catch (error) {
        console.error('Error processing message:', error);
        addMessage("I'm sorry, I'm having trouble connecting right now.", 'bot');
        setIsLoading(false);
      }
    }, 500);
  };

  const handleSendMessage = async (messageOverride, isPending = false) => {
    const messageContent = messageOverride || inputMessage;
    const trimmedMessage = messageContent.trim();
    if (!trimmedMessage) return;
    if (!isPending) {
      addMessage(trimmedMessage, 'user'); // User messages are now passed as simple strings
      setInputMessage('');
    }
    const authKeywords = ['balance', 'transfer', 'account', 'payment', 'transactions'];
    if (activeTab === 'banking' && authKeywords.some(keyword => trimmedMessage.toLowerCase().includes(keyword)) && !isAuthenticated) {
      addMessage("For security, please log in to access your account details.", 'bot');
      setPendingRequest(trimmedMessage);
      onLoginRequired();
      return;
    }
    processMessage({ role: 'user', content: trimmedMessage });
  };

  return { messages: messages[activeTab], inputMessage, isLoading, setInputMessage, handleSendMessage };
}