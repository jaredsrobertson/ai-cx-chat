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
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dfClient = new DialogflowClient();
      const lxClient = new LexClient();
      setDialogflowClient(dfClient);
      setLexClient(lxClient);
      
      const previousBot = localStorage.getItem('lastBot') as 'dialogflow' | 'lex' | null;
      const previousMessages = localStorage.getItem(`${previousBot}-messages`);
      
      if (previousBot && previousMessages) {
        setHasResumeOption(true);
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
      if (quickReplies.length > 0) {
        setLastQuickReplies(quickReplies);
      }
    } catch (error) {
      console.error('Error fetching welcome message:', error);
      setMessages([{
        text: 'Sorry, I couldn\'t connect. Please try again.',
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSelectBot = (bot: 'dialogflow' | 'lex') => {
    setSelectedBot(bot);
    setMessages([]);
    setLastQuickReplies([]);
    
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
      setLastQuickReplies(welcomeMessage.quickReplies || []);
    }
  };

  const handleResume = () => {
    if (lastBot) {
      const savedMessages = localStorage.getItem(`${lastBot}-messages`);
      if (savedMessages) {
        setSelectedBot(lastBot);
        setMessages(JSON.parse(savedMessages));
        const parsed = JSON.parse(savedMessages);
        const lastMessage = parsed[parsed.length - 1];
        if (lastMessage?.quickReplies) {
          setLastQuickReplies(lastMessage.quickReplies);
        }
      }
    }
  };

  const sendMessage = async (text: string) => {
    if (!selectedBot || !text.trim()) return;

    if (text !== 'I am now authenticated') {
        const userMessage: ChatMessage = { text, isUser: true, timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
    }
    setInput('');
    setLastQuickReplies([]);
    setIsTyping(true);

    try {
      if (selectedBot === 'dialogflow' && dialogflowClient) {
        const response = await dialogflowClient.sendMessage(text, isAuthenticated);
        const botText = response.queryResult.fulfillmentText;
        const quickReplies = dialogflowClient.parseQuickReplies(response.queryResult.fulfillmentMessages);
        const payload = dialogflowClient.parsePayload(response.queryResult.fulfillmentMessages);
        
        const botMessage: ChatMessage = {
          text: botText, isUser: false, timestamp: new Date(), quickReplies, payload
        };
        setMessages(prev => [...prev, botMessage]);
        
        if (quickReplies.length > 0) {
          setLastQuickReplies(quickReplies);
        }

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
    }
  };

  const handleLogin = async () => {
    if (dialogflowClient) {
      dialogflowClient.setAuthenticated(true);
      setIsAuthenticated(true);
      setShowLoginModal(false);
      
      await sendMessage('I am now authenticated');
      
      if (pendingMessage) {
        await sendMessage(pendingMessage);
        setPendingMessage(null);
      }
    }
  };

  const handleQuickReply = (reply: string) => { sendMessage(reply); };

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
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-sky-600 text-white rounded-full p-4 shadow-lg hover:bg-sky-700 transition-all hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-40 bg-white shadow-2xl flex flex-col w-96 h-[70vh] max-h-[600px] min-h-[400px] rounded-lg">
          <div className="bg-gradient-to-r from-sky-600 to-sky-700 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <h3 className="font-semibold">SecureBank Assistant</h3>
                <p className="text-xs opacity-90">{selectedBot === 'dialogflow' ? 'Banking Services' : selectedBot === 'lex' ? 'Customer Support' : 'Choose an assistant'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedBot && (<button onClick={clearConversation} className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors" title="New conversation"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>)}
              <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {!selectedBot ? (
              <div className="flex-1 overflow-y-auto"><BotSelector onSelectBot={handleSelectBot} hasResumeOption={hasResumeOption} onResume={handleResume}/></div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {messages.map((message, index) => (<Message key={index} text={message.text} isUser={message.isUser} timestamp={message.timestamp}/>))}
                  {isTyping && (<Message text="" isUser={false} isTyping={true}/>)}
                  <div ref={messagesEndRef} />
                </div>
                {lastQuickReplies.length > 0 && !isTyping && (<QuickReplies replies={lastQuickReplies} onReplyClick={handleQuickReply} disabled={isTyping}/>)}
                <div className="border-t border-slate-200 px-4 py-2 bg-slate-50 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Bot: {selectedBot === 'dialogflow' ? 'Dialogflow' : 'Lex'}</span>
                    {isAuthenticated && <span className="text-green-600">● Authenticated</span>}
                    <button className="text-sky-600 hover:text-sky-700" title="Transfer to agent" onClick={() => sendMessage('talk to an agent')}>Agent Transfer</button>
                  </div>
                </div>
                <div className="border-t border-slate-200 p-4">
                  <div className="flex gap-2">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => {if (e.key === 'Enter' && !e.shiftKey) {e.preventDefault(); sendMessage(input);}}} placeholder="Type your message..." disabled={isTyping} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100"/>
                    <button onClick={() => sendMessage(input)} disabled={isTyping || !input.trim()} className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
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