import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

// Central hook to manage all chat state and logic
export function useChat(activeTab, onLoginRequired) {
  const [messages, setMessages] = useState({
    banking: [{ id: 1, text: "Hi! I'm your SecureBank assistant. How can I assist you today?", sender: 'bot', timestamp: new Date() }],
    advisor: [{ id: 1, text: "Hello! I'm your personal financial advisor. What would you like to discuss?", sender: 'bot', timestamp: new Date() }]
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const { user, isAuthenticated } = useAuth();

  // Handle pending requests after a user logs in
  useEffect(() => {
    if (isAuthenticated && pendingRequest) {
      processMessage(pendingRequest);
      setPendingRequest(null);
    }
  }, [isAuthenticated, pendingRequest]);

  // Helper to add a message to the UI
  const addMessage = (text, sender) => {
    const message = {
      id: Date.now() + Math.random(),
      text,
      sender,
      timestamp: new Date()
    };
    setMessages(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], message]
    }));
  };

  // --- Mock Live Agent Handoff ---
  const handleAgentHandoff = async () => {
    setIsLoading(true);
    addMessage("I understand. Let me connect you to a live agent.", 'bot');
    await new Promise(resolve => setTimeout(resolve, 2000));
    addMessage("It looks like all our agents are busy. Would you like to request a callback?", 'bot');
    setIsLoading(false);
  };

  // --- Central Message Processing Logic ---
  const processMessage = async (messageToProcess) => {
    setIsLoading(true);
    try {
      const endpoint = activeTab === 'banking' ? '/api/chat/banking' : '/api/chat/financial-advisor';
      const token = localStorage.getItem('authToken');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) },
        body: JSON.stringify({ message: messageToProcess })
      });
      const data = await response.json();
      addMessage(data.response, 'bot');
    } catch (error) {
      console.error('Error processing message:', error);
      addMessage("I'm sorry, I'm having trouble connecting right now. Please try again in a moment.", 'bot');
    }
    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage) return;

    addMessage(trimmedMessage, 'user');
    setInputMessage('');

    const agentKeywords = ['agent', 'human', 'person', 'representative'];
    if (agentKeywords.some(keyword => trimmedMessage.toLowerCase().includes(keyword))) {
      handleAgentHandoff();
      return;
    }

    const authKeywords = ['balance', 'transfer', 'account', 'payment', 'transactions'];
    if (activeTab === 'banking' && authKeywords.some(keyword => trimmedMessage.toLowerCase().includes(keyword)) && !isAuthenticated) {
      addMessage("For security, please log in to access your account details.", 'bot');
      setPendingRequest(trimmedMessage);
      onLoginRequired();
      return;
    }

    processMessage(trimmedMessage);
  };

  return {
    messages: messages[activeTab],
    inputMessage,
    isLoading,
    setInputMessage,
    handleSendMessage
  };
}