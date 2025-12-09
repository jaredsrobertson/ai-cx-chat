import { useState, useEffect, useCallback } from 'react';
import DialogflowClient from '@/lib/dialogflow-client';
import LexClient from '@/lib/lex-client';
import { ChatMessage, BotType } from '@/types';

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [dialogflowClient, setDialogflowClient] = useState<DialogflowClient | null>(null);
  const [lexClient, setLexClient] = useState<LexClient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authRequired, setAuthRequired] = useState<{ required: boolean; message: string }>({ required: false, message: '' });
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const dfClient = new DialogflowClient();
        setDialogflowClient(dfClient);
        setLexClient(new LexClient());
        setIsAuthenticated(dfClient.isAuthenticated());
    }
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  // Standardized Welcome Trigger
  const triggerWelcome = async (bot: BotType) => {
    setIsTyping(true);
    try {
      if (bot === 'dialogflow' && dialogflowClient) {
        // Send WELCOME event instead of "hi" text
        const response = await dialogflowClient.sendEvent('WELCOME', isAuthenticated);
        const result = response.queryResult;
        
        addMessage({
          text: result.fulfillmentText || 'Welcome!',
          isUser: false,
          timestamp: new Date(),
          quickReplies: dialogflowClient.parseQuickReplies(result.fulfillmentMessages),
          intent: result.intent?.displayName,
        });
      } else if (bot === 'lex') {
        // Static local welcome for Lex (Common pattern for FAQ bots)
        addMessage({
          text: 'Welcome to SecureBank Support! I can help with account questions, security, and FAQs.',
          isUser: false,
          timestamp: new Date(),
          quickReplies: ['Account info', 'Lost/stolen card', 'Fees', 'Hours']
        });
      }
    } catch (error) {
      addMessage({ text: "Connection failed. Please try again.", isUser: false, timestamp: new Date() });
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async (text: string, bot: BotType, isAuthRetry = false) => {
    if (!text.trim()) return;

    if (!isAuthRetry) {
        addMessage({ text, isUser: true, timestamp: new Date() });
    }
    
    setIsTyping(true);

    try {
      if (bot === 'dialogflow' && dialogflowClient) {
        const response = await dialogflowClient.sendMessage(text, isAuthenticated, isAuthRetry);
        const result = response.queryResult;
        const payload = dialogflowClient.parsePayload(result.fulfillmentMessages);

        addMessage({
          text: result.fulfillmentText,
          isUser: false,
          timestamp: new Date(),
          quickReplies: dialogflowClient.parseQuickReplies(result.fulfillmentMessages),
          payload,
          intent: result.intent?.displayName,
        });

        if (payload?.action === 'REQUIRE_AUTH' && !isAuthenticated) {
          setAuthRequired({ required: true, message: payload.message as string || 'Authentication required' });
        }

      } else if (bot === 'lex' && lexClient) {
        const response = await lexClient.sendMessage(text);
        addMessage({
          text: lexClient.parseText(response),
          isUser: false,
          timestamp: new Date(),
          quickReplies: lexClient.parseQuickReplies(response),
          intent: response.sessionState?.intent?.name,
          nluConfidence: lexClient.getNLUConfidence(response),
        });
      }
    } catch (error) {
      addMessage({ text: "Error connecting to server.", isUser: false, timestamp: new Date() });
    } finally {
      setIsTyping(false);
    }
  };

  const authenticateUser = () => {
    if (dialogflowClient) {
      dialogflowClient.setAuthenticated(true);
      setIsAuthenticated(true);
      setAuthRequired({ required: false, message: '' });
    }
  };

  const resetConversation = (bot: BotType) => {
      clearMessages();
      if (bot === 'dialogflow' && dialogflowClient) {
          dialogflowClient.clearSession();
          dialogflowClient.setAuthenticated(false);
          setIsAuthenticated(false);
      } else if (bot === 'lex' && lexClient) {
          lexClient.clearSession();
      }
  };

  return {
    messages,
    isTyping,
    sendMessage,
    triggerWelcome,
    addMessage,
    clearMessages,
    isAuthenticated,
    authenticateUser,
    authRequired,
    setAuthRequired,
    resetConversation
  };
};