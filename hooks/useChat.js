import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './useAuth';
import { useTTS } from '../contexts/TTSContext';

export function useChat(initialTab, onLoginRequired) {
  const [messages, setMessages] = useState({
    banking: [{
      id: uuidv4(),
      author: 'bot',
      type: 'structured',
      content: { speakableText: "Welcome to the SecureBank Concierge. I can help you with account balances, transaction history, and fund transfers. You can also ask to speak with a live agent. How can I assist you today?" },
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
  const [pendingRequest, setPendingRequest] = useState(null);
  
  const { isAuthenticated, user } = useAuth();
  const { play, isAutoResponseEnabled } = useTTS();
  
  const fallbackCount = useRef(0);
  const previousIsAuthenticated = useRef(isAuthenticated);

  // Intents that require authentication
  const AUTH_REQUIRED_INTENTS = [
    'account.balance', 'account.transfer', 'account.transfer - yes', 
    'account.transactions', 'transaction.history', 'balance.check', 
    'account.balance.check', 'fund.transfer', 'account.fund.transfer', 
    'transactions', 'account.transaction.history'
  ];

  // Add message with automatic fallback handling
  const addMessage = useCallback((tab, author, type, content, id = uuidv4()) => {
    const fallbackText = "I'm sorry, I didn't quite understand.";
    const agentOfferText = "It seems I'm still having trouble. Would you like to speak with a live agent?";

    setMessages(prev => {
      let newMessages = [...prev[tab], {
        id, author, type, content, timestamp: new Date()
      }];

      // Handle consecutive fallbacks
      if (author === 'bot' && content.speakableText?.startsWith(fallbackText)) {
        fallbackCount.current += 1;
        
        if (fallbackCount.current >= 2) {
          newMessages.push({
            id: uuidv4(),
            author: 'bot',
            type: 'structured',
            content: { speakableText: agentOfferText },
            timestamp: new Date()
          });
          fallbackCount.current = 0;
        }
      } else if (author === 'bot') {
        fallbackCount.current = 0;
      }

      return { ...prev, [tab]: newMessages };
    });
  }, []);

  // Update message content (for streaming responses)
  const updateMessageContent = useCallback((tab, messageId, newContent) => {
    setMessages(prev => ({
      ...prev,
      [tab]: prev[tab].map(msg => 
        msg.id === messageId ? { ...msg, content: newContent } : msg
      ),
    }));
  }, []);

  // Get contextual login message based on intent
  const getLoginMessage = (intentName) => {
    const messages = {
      'account.balance': "Please log in to view your account balance. I'll show you the information right after you sign in.",
      'account.transactions': "Please log in to view your transaction history. I'll show you the information right after you sign in.",
      'account.transfer': "Please log in to complete your transfer. I'll process your request right after you sign in.",
      'transaction.history': "Please log in to view your transaction history. I'll show you the information right after you sign in.",
    };
    
    return messages[intentName] || "For security, please log in to access your account information.";
  };

  // Process pending request after authentication
  const processPendingRequest = useCallback(async (request) => {
    console.log('🔄 Processing pending request:', request.intentName);
    
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.error('❌ No auth token found when processing pending request');
        return;
      }

      const response = await fetch('/api/chat/banking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: request.message, 
          sessionId: request.sessionId 
        }),
      });

      const data = await response.json();
      console.log('🔄 Pending request API response:', data);

      if (data.success) {
        addMessage(request.tab, 'bot', 'structured', data.data.response);
        
        if (data.data.sessionId) {
          localStorage.setItem(`sessionId_${user?.id || 'guest'}`, data.data.sessionId);
        }
        
        console.log('✅ Pending request completed successfully');
      } else {
        addMessage(request.tab, 'bot', 'structured', { 
          speakableText: data.error 
        });
        console.error('❌ Pending request failed:', data.error);
      }
    } catch (error) {
      console.error('❌ Error processing pending request:', error);
      addMessage(request.tab, 'bot', 'structured', { 
        speakableText: "I'm sorry, there was an issue processing your request. Please try again." 
      });
    }
  }, [addMessage, user]);

  // Combined effect to handle authentication state transitions
  useEffect(() => {
    // Check for login: transition from false to true
    if (!previousIsAuthenticated.current && isAuthenticated && pendingRequest) {
      console.log('🔐 Login transition detected. Processing pending request...');
      
      const timer = setTimeout(() => {
          processPendingRequest(pendingRequest);
          setPendingRequest(null);
      }, 100);

      return () => clearTimeout(timer);
    }

    // Check for logout: transition from true to false
    if (previousIsAuthenticated.current && !isAuthenticated && pendingRequest) {
      console.log('🚪 Logout transition detected. Clearing pending request.');
      setPendingRequest(null);
    }

    // IMPORTANT: Update the ref at the end of the effect for the next render cycle.
    previousIsAuthenticated.current = isAuthenticated;

  }, [isAuthenticated, pendingRequest, processPendingRequest]);
  
  // Process chat messages
  const processMessage = useCallback(async (message, tab) => {
    setLoading(true);

    // Optimistically add the user's message for all tabs
    addMessage(tab, 'user', 'text', message);

    try {
      if (tab === 'advisor') {
        // Handle AI Advisor with streaming
        const messageHistory = messages.advisor.map(msg => ({
          role: msg.author === 'user' ? 'user' : 'assistant',
          content: msg.type === 'text' ? msg.content : msg.content.speakableText
        }));

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

        // Stream response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamedContent = '';
        const placeholderId = uuidv4();
        
        addMessage(tab, 'bot', 'text', '...', placeholderId);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          streamedContent += decoder.decode(value, { stream: true });
          updateMessageContent(tab, placeholderId, { speakableText: streamedContent });
        }

        // Auto-play if enabled
        if (isAutoResponseEnabled && streamedContent) {
          play(streamedContent, placeholderId);
        }

      } else {
        // Handle Banking Assistant
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
          
          // Check if authentication is required
          if (AUTH_REQUIRED_INTENTS.includes(responsePayload.intentName) && !isAuthenticated) {
            console.log('🔒 Authentication required for intent:', responsePayload.intentName);
            
            // Show contextual login message
            const loginMessage = getLoginMessage(responsePayload.intentName);
            addMessage(tab, 'bot', 'structured', { speakableText: loginMessage });
            
            // Store pending request with all necessary data
            const pending = { 
              message, 
              tab, 
              sessionId: data.data.sessionId, 
              intentName: responsePayload.intentName,
              timestamp: new Date()
            };
            
            console.log('💾 Storing pending request:', pending);
            setPendingRequest(pending);
            
            // Trigger login modal
            onLoginRequired();
            setLoading(false);
            return;
          }

          // Normal response flow
          addMessage(tab, 'bot', 'structured', responsePayload);
          
          // Store session ID
          if (data.data.sessionId) {
            localStorage.setItem(`sessionId_${user?.id || 'guest'}`, data.data.sessionId);
          }
        } else {
          addMessage(tab, 'bot', 'structured', { speakableText: data.error });
        }
      }
    } catch (error) {
      console.error('❌ Chat processing error:', error);
      addMessage(tab, 'bot', 'structured', { 
        speakableText: "Sorry, I encountered an error. Please try again." 
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, messages, onLoginRequired, addMessage, updateMessageContent, isAutoResponseEnabled, play, processPendingRequest]);

  return { 
    messages, 
    loading, 
    processMessage
  };
}