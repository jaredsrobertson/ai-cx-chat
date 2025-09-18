// components/ChatWidget.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import DialogflowClient from '@/lib/dialogflow-client';
import LexClient from '@/lib/lex-client';
import BotSelector from './BotSelector';
import Message from './Message';
import QuickReplies from './QuickReplies';
import LoginModal from './LoginModal';
import CloudIcon from './CloudIcon';

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  quickReplies?: string[];
  payload?: Record<string, unknown> | null;
}

export default function ChatWidget() {
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
  const [lastBot, setLastBot] = useState<'dialogflow' | 'lex' | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dfClient = new DialogflowClient();
      const lxClient = new LexClient();
      setDialogflowClient(dfClient);
      setLexClient(lxClient);
      
      const previousBot = localStorage.getItem('lastBot') as 'dialogflow' | 'lex' | null;
      const previousMessages = localStorage.getItem(`${previousBot}-messages`);
      
      if (previousBot && previousMessages) {
        setLastBot(previousBot);
      }
      
      setIsAuthenticated(dfClient.isAuthenticated());
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedBot && messages.length > 0) {
      localStorage.setItem('lastBot', selectedBot);
      localStorage.setItem(`${selectedBot}-messages`, JSON.stringify(messages));
    }
  }, [selectedBot, messages]);

  const fetchWelcomeMessage = async () => {
    if (!dialogflowClient) return;
    setIsTyping(true);
    try {
      const response = await dialogflowClient.sendMessage('hi');
      const botText = response.queryResult.fulfillmentText;
      const quickReplies = dialogflowClient.parseQuickReplies(response.queryResult.fulfillmentMessages);
      
      const welcomeMessage: ChatMessage = {
        text: botText,
        isUser: false,
        timestamp: new Date(),
        quickReplies
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error fetching welcome message:', error);
      setMessages([{
        text: 'Sorry, I couldn\'t connect. Please try again.',
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleSelectBot = (bot: 'dialogflow' | 'lex') => {
    setSelectedBot(bot);
    setMessages([]);
    localStorage.removeItem('lastBot');
    localStorage.removeItem(`${bot}-messages`);
    
    if (bot === 'dialogflow') {
      fetchWelcomeMessage();
    } else {
      const welcomeMessage: ChatMessage = {
        text: 'Welcome to SecureBank Support! I can help you with account questions, security concerns, and general banking FAQs. What would you like to know?',
        isUser: false,
        timestamp: new Date(),
        quickReplies: ['Account Help', 'Security Questions', 'Banking Hours', 'Talk to Agent']
      };
      setMessages([welcomeMessage]);
    }
  };

  const handleResume = () => {
    if (lastBot) {
      const savedMessages = localStorage.getItem(`${lastBot}-messages`);
      if (savedMessages) {
        setSelectedBot(lastBot);
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
      }
    }
  };

  const sendMessage = async (text: string, authContext = false) => {
    if (!selectedBot || !text.trim()) return;
    
    const userMessage: ChatMessage = { text, isUser: true, timestamp: new Date() };
    setMessages(prev => {
      const updatedMessages = [...prev];
      if (updatedMessages.length > 0) {
        const lastMsg = updatedMessages[updatedMessages.length - 1];
        if (!lastMsg.isUser && lastMsg.quickReplies) {
          delete lastMsg.quickReplies;
        }
      }
      return [...updatedMessages, userMessage];
    });

    setInput('');
    setIsTyping(true);

    try {
      if (selectedBot === 'dialogflow' && dialogflowClient) {
        const response = await dialogflowClient.sendMessage(text, isAuthenticated, authContext);
        const botText = response.queryResult.fulfillmentText;
        const quickReplies = dialogflowClient.parseQuickReplies(response.queryResult.fulfillmentMessages);
        const payload = dialogflowClient.parsePayload(response.queryResult.fulfillmentMessages);
        
        const botMessage: ChatMessage = {
          text: botText, isUser: false, timestamp: new Date(), quickReplies, payload
        };
        setMessages(prev => [...prev, botMessage]);

        if (payload?.action === 'REQUIRE_AUTH' && !isAuthenticated) {
          setPendingMessage(text);
          setLoginMessage(payload.message as string || 'Please authenticate to continue');
          setTimeout(() => setShowLoginModal(true), 500);
        }
      } else if (selectedBot === 'lex' && lexClient) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const lexMessage: ChatMessage = {
          text: 'I understand you\'re asking about: "' + text + '". This feature is coming soon.',
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
      inputRef.current?.focus();
    }
  };

  const handleLogin = async () => {
    if (dialogflowClient) {
      dialogflowClient.setAuthenticated(true);
      setIsAuthenticated(true);
      setShowLoginModal(false);
      
      if (pendingMessage) {
        await sendMessage(pendingMessage, true);
        setPendingMessage(null);
      }
    }
  };

  const handleQuickReply = (reply: string) => { sendMessage(reply); };

  const clearConversation = () => {
    setMessages([]);
    setLastBot(null);
    if (selectedBot) {
      localStorage.removeItem('lastBot');
      localStorage.removeItem(`${selectedBot}-messages`);
    }
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
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-blue-500 text-white rounded-full p-5 shadow-lg hover:bg-blue-600 transition-all hover:scale-110"
        >
          <CloudIcon className="w-8 h-8" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-40 bg-white shadow-2xl flex flex-col 
                       w-full h-full sm:w-96 sm:h-[70vh] sm:max-h-[600px] sm:min-h-[400px] 
                       rounded-none sm:rounded-lg">
          <div className="bg-blue-500 text-white p-4 // Adjusted blue
                         rounded-t-none sm:rounded-t-lg flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                <CloudIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">AI Assistant</h3>
                <p className="text-xs opacity-90">{selectedBot === 'dialogflow' ? 'Banking Services' : selectedBot === 'lex' ? 'Customer Support' : 'Choose an assistant'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearConversation} className="text-white hover:bg-white/20 rounded p-1 transition-colors" title="New conversation"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
              <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 rounded p-1 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
            </div>
          </div>
          
          {selectedBot && (
            <div className="border-b border-blue-200 px-4 py-2 bg-blue-100 text-xs text-blue-800"> {/* Adjusted blues */}
              <div className="flex items-center justify-between">
                <span>Bot: {selectedBot === 'dialogflow' ? 'Dialogflow' : 'Lex'}</span>
                {isAuthenticated && <span className="text-green-600 font-semibold flex items-center gap-1">● Authenticated</span>}
                <button className="text-blue-600 hover:text-blue-700 font-semibold" title="Transfer to agent" onClick={() => sendMessage('talk to an agent')}>Agent Transfer</button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden flex flex-col bg-blue-50"> {/* Adjusted blue */}
            {!selectedBot ? (
              <div className="flex-1 overflow-y-auto"><BotSelector onSelectBot={handleSelectBot} lastBot={lastBot} onResume={handleResume}/></div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  {messages.map((message, index) => (
                    <div key={index}>
                      <Message
                        text={message.text}
                        isUser={message.isUser}
                        timestamp={message.timestamp}
                      />
                      {index === messages.length - 1 && !isTyping && !message.isUser && message.quickReplies && message.quickReplies.length > 0 && (
                        <QuickReplies
                          replies={message.quickReplies}
                          onReplyClick={handleQuickReply}
                          disabled={isTyping}
                        />
                      )}
                    </div>
                  ))}
                  {isTyping && (<Message text="" isUser={false} isTyping={true}/>)}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="border-t border-blue-200 p-4 bg-white"> {/* Adjusted blue */}
                  <div className="flex gap-2">
                    <input 
                      ref={inputRef}
                      type="text" 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)} 
                      onKeyPress={(e) => {if (e.key === 'Enter' && !e.shiftKey) {e.preventDefault(); sendMessage(input);}}} 
                      placeholder="Type your message..."
                      disabled={isTyping} 
                      className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-50 text-slate-800" // Adjusted blue
                    />
                    <button onClick={() => sendMessage(input)} disabled={isTyping || !input.trim()} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"> {/* Adjusted blue */}
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLogin={handleLogin} message={loginMessage}/>
    </>
  );
}