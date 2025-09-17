// components/ChatWidget.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import DialogflowClient from '@/lib/dialogflow-client';
import LexClient from '@/lib/lex-client';
import BotSelector from './BotSelector';
import Message from './Message';
import QuickReplies from './QuickReplies';
import LoginModal from './LoginModal';

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  quickReplies?: string[];
  payload?: Record<string, unknown> | null;
}

export default function ChatWidget() {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<'dialogflow' | 'lex' | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dialogflowClient, setDialogflowClient] = useState<DialogflowClient | null>(null);
  const [lexClient, setLexClient] = useState<LexClient | null>(null);
  const [lastQuickReplies, setLastQuickReplies] = useState<string[]>([]);
  const [hasResumeOption, setHasResumeOption] = useState(false);
  const [lastBot, setLastBot] = useState<'dialogflow' | 'lex' | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize clients on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dfClient = new DialogflowClient();
      const lxClient = new LexClient();
      setDialogflowClient(dfClient);
      setLexClient(lxClient);
      
      // Check for previous session
      const previousBot = localStorage.getItem('lastBot') as 'dialogflow' | 'lex' | null;
      const previousMessages = localStorage.getItem(`${previousBot}-messages`);
      
      if (previousBot && previousMessages) {
        setHasResumeOption(true);
        setLastBot(previousBot);
      }
      
      // Check authentication status
      setIsAuthenticated(dfClient.isAuthenticated());
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save session
  useEffect(() => {
    if (selectedBot && messages.length > 0) {
      localStorage.setItem('lastBot', selectedBot);
      localStorage.setItem(`${selectedBot}-messages`, JSON.stringify(messages));
    }
  }, [selectedBot, messages]);

  // Handle bot selection
  const handleSelectBot = (bot: 'dialogflow' | 'lex') => {
    setSelectedBot(bot);
    setMessages([]);
    setLastQuickReplies([]);
    
    // Send welcome message
    if (bot === 'dialogflow') {
      sendMessage('hi', bot);
    } else {
      // Lex welcome (placeholder for now)
      setMessages([{
        text: 'Welcome to SecureBank Support! I can help you with account questions, security concerns, and general banking FAQs. What would you like to know?',
        isUser: false,
        timestamp: new Date(),
        quickReplies: ['Account Help', 'Security Questions', 'Banking Hours', 'Talk to Agent']
      }]);
      setLastQuickReplies(['Account Help', 'Security Questions', 'Banking Hours', 'Talk to Agent']);
    }
  };

  // Resume previous chat
  const handleResume = () => {
    if (lastBot) {
      const savedMessages = localStorage.getItem(`${lastBot}-messages`);
      if (savedMessages) {
        setSelectedBot(lastBot);
        setMessages(JSON.parse(savedMessages));
        // Extract last quick replies if any
        const parsed = JSON.parse(savedMessages);
        const lastMessage = parsed[parsed.length - 1];
        if (lastMessage?.quickReplies) {
          setLastQuickReplies(lastMessage.quickReplies);
        }
      }
    }
  };

  // Send message
  const sendMessage = async (text: string, bot?: 'dialogflow' | 'lex') => {
    const currentBot = bot || selectedBot;
    if (!currentBot || !text.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      text,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLastQuickReplies([]);
    setIsTyping(true);

    try {
      if (currentBot === 'dialogflow' && dialogflowClient) {
        const response = await dialogflowClient.sendMessage(text);
        const botText = response.queryResult.fulfillmentText;
        const quickReplies = dialogflowClient.parseQuickReplies(response.queryResult.fulfillmentMessages);
        const payload = dialogflowClient.parsePayload(response.queryResult.fulfillmentMessages);

        // Check for special actions
        if (payload?.action === 'REQUIRE_AUTH' && !isAuthenticated) {
          setLoginMessage(payload.message as string || 'Please authenticate to continue');
          setShowLoginModal(true);
          setIsTyping(false);
          return;
        } else if (payload?.action === 'TRANSFER_AGENT') {
          setMessages(prev => [...prev, {
            text: '👤 Connecting you to a live agent. Please wait...\n\n[Agent John has joined the chat]\nAgent: Hello! I\'m John. How can I assist you today?',
            isUser: false,
            timestamp: new Date()
          }]);
          setIsTyping(false);
          return;
        }

        // Add bot response
        const botMessage: ChatMessage = {
          text: botText,
          isUser: false,
          timestamp: new Date(),
          quickReplies,
          payload
        };
        setMessages(prev => [...prev, botMessage]);
        
        if (quickReplies.length > 0) {
          setLastQuickReplies(quickReplies);
        }
      } else if (currentBot === 'lex' && lexClient) {
        // Placeholder Lex response
        await new Promise(resolve => setTimeout(resolve, 1000));
        const lexMessage: ChatMessage = {
          text: 'I understand you\'re asking about: "' + text + '". This feature is coming soon in Phase 5.',
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, lexMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle authentication
  const handleLogin = () => {
    if (dialogflowClient) {
      dialogflowClient.setAuthenticated(true);
      setIsAuthenticated(true);
      setShowLoginModal(false);
      
      // Send authenticated message
      setMessages(prev => [...prev, {
        text: '✅ Successfully authenticated! You can now access your account information.',
        isUser: false,
        timestamp: new Date()
      }]);
      
      // Trigger authenticated context in Dialogflow
      sendMessage('I am now authenticated');
    }
  };

  // Handle quick reply click
  const handleQuickReply = (reply: string) => {
    sendMessage(reply);
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    setLastQuickReplies([]);
    if (selectedBot === 'dialogflow' && dialogflowClient) {
      dialogflowClient.clearSession();
      setIsAuthenticated(false);
    } else if (selectedBot === 'lex' && lexClient) {
      lexClient.clearSession();
    }
    setSelectedBot(null);
  };

  return (
    <>
      {/* Chat FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-sky-600 text-white rounded-full p-4 shadow-lg hover:bg-sky-700 transition-all hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-40 bg-white shadow-2xl flex flex-col w-96 h-[70vh] max-h-[600px] min-h-[400px] rounded-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-600 to-sky-700 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">SecureBank Assistant</h3>
                <p className="text-xs opacity-90">
                  {selectedBot === 'dialogflow' ? 'Banking Services' : 
                   selectedBot === 'lex' ? 'Customer Support' : 
                   'Choose an assistant'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedBot && (
                <button
                  onClick={clearConversation}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
                  title="New conversation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!selectedBot ? (
              // Bot selector
              <div className="flex-1 overflow-y-auto">
                <BotSelector 
                  onSelectBot={handleSelectBot}
                  hasResumeOption={hasResumeOption}
                  onResume={handleResume}
                />
              </div>
            ) : (
              // Chat interface
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {messages.map((message, index) => (
                    <Message
                      key={index}
                      text={message.text}
                      isUser={message.isUser}
                      timestamp={message.timestamp}
                    />
                  ))}
                  {isTyping && (
                    <Message
                      text=""
                      isUser={false}
                      isTyping={true}
                    />
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick replies */}
                {lastQuickReplies.length > 0 && !isTyping && (
                  <QuickReplies
                    replies={lastQuickReplies}
                    onReplyClick={handleQuickReply}
                    disabled={isTyping}
                  />
                )}

                {/* Analytics strip */}
                <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Bot: {selectedBot === 'dialogflow' ? 'Dialogflow' : 'Lex'}</span>
                    {isAuthenticated && <span className="text-green-600">● Authenticated</span>}
                    <button
                      className="text-sky-600 hover:text-sky-700"
                      title="Transfer to agent"
                      onClick={() => sendMessage('talk to an agent')}
                    >
                      Agent Transfer
                    </button>
                  </div>
                </div>

                {/* Input bar */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(input);
                        }
                      }}
                      placeholder="Type your message..."
                      disabled={isTyping}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-100"
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={isTyping || !input.trim()}
                      className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        message={loginMessage}
      />
    </>
  );
}