'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { BotType } from '@/types';
import BotSelector from './BotSelector';
import Message from './Message';
import QuickReplies from './QuickReplies';
import LoginModal from './LoginModal';
import CloudIcon from './CloudIcon';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotType | null>(null);
  const [input, setInput] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [lastBot, setLastBot] = useState<BotType | null>(null);

  const { 
    messages, isTyping, sendMessage, triggerWelcome, clearMessages, 
    isAuthenticated, authenticateUser, authRequired, setAuthRequired, resetConversation
  } = useChat();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const previousBot = localStorage.getItem('lastBot') as BotType | null;
      if (previousBot) setLastBot(previousBot);
    }
  }, []);

  useEffect(() => {
    if (selectedBot) localStorage.setItem('lastBot', selectedBot);
  }, [selectedBot]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (isOpen && selectedBot && !isTyping) inputRef.current?.focus();
  }, [messages, isOpen, selectedBot, isTyping]);

  useEffect(() => {
    if (authRequired.required) setShowLoginModal(true);
  }, [authRequired]);

  const handleSelectBot = (bot: BotType) => {
    setSelectedBot(bot);
    clearMessages();
    resetConversation(bot);
    // CLEAN TRIGGER: No hidden messages
    triggerWelcome(bot);
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedBot || !text.trim()) return;
    setInput('');
    setPendingMessage(text);
    await sendMessage(text, selectedBot);
  };

  const handleLogin = async () => {
    authenticateUser();
    setShowLoginModal(false);
    if (pendingMessage && selectedBot) {
        await sendMessage(pendingMessage, selectedBot, true);
        setPendingMessage(null);
    }
  };

  const handleClearConversation = () => {
    if (selectedBot) resetConversation(selectedBot);
    setSelectedBot(null);
    localStorage.removeItem('lastBot');
  };

  const handleResume = () => {
      if (lastBot) setSelectedBot(lastBot);
  };

  // Helper to show quick replies only on the latest bot message
  const lastBotMessage = [...messages].reverse().find(m => !m.isUser);
  const shouldShowQuickReplies = Boolean(
    !isTyping && 
    lastBotMessage?.quickReplies && 
    lastBotMessage.quickReplies.length > 0
  );

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-blue-600 text-white rounded-full p-5 shadow-lg hover:bg-blue-700 transition-all hover:scale-110 animate-bounce"
        >
          <CloudIcon className="w-8 h-8" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-40 bg-blue-200 shadow-2xl flex flex-col w-screen h-screen sm:w-96 sm:h-[70vh] sm:max-h-[600px] sm:min-h-[400px] rounded-none sm:rounded-lg">
          <div className="bg-blue-950 text-white p-4 rounded-t-none sm:rounded-t-lg flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                <CloudIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">AI Assistant</h3>
                <p className="text-xs opacity-90">{selectedBot === 'dialogflow' ? 'Dialogflow' : selectedBot === 'lex' ? 'Lex' : 'Choose an assistant'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleClearConversation} className="text-white hover:bg-white/20 rounded p-1 transition-colors" title="Restart">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 rounded p-1 transition-colors" title="Close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          </div>
          
          {selectedBot && (
            <div className="border-b border-gray-200 px-4 py-2 bg-gray-100 text-xs text-gray-800 flex justify-between items-center min-h-[32px]">
               {messages.length > 0 && !messages[messages.length-1].isUser && messages[messages.length-1].intent && (
                 <span className="text-gray-600 font-semibold truncate max-w-[70%]">
                   Intent: {messages[messages.length-1].intent}
                   {selectedBot === 'lex' && messages[messages.length-1].nluConfidence !== undefined && 
                     ` (${(messages[messages.length-1].nluConfidence! * 100).toFixed(0)}%)`}
                 </span>
               )}
               {isAuthenticated && <span className="text-green-600 font-semibold flex items-center gap-1">● Authenticated</span>}
            </div>
          )}

          <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
            {!selectedBot ? (
              <div className="flex-1 overflow-y-auto">
                <BotSelector onSelectBot={handleSelectBot} lastBot={lastBot} onResume={handleResume}/>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  {messages.map((message, index) => (
                    <Message key={index} {...message} />
                  ))}
                  {isTyping && <Message text="" isUser={false} isTyping={true}/>}
                  
                  {shouldShowQuickReplies && lastBotMessage?.quickReplies && (
                    <div className="mt-4">
                      <QuickReplies
                        replies={lastBotMessage.quickReplies}
                        onReplyClick={handleSendMessage}
                        disabled={isTyping}
                      />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="border-t border-gray-200 p-4 bg-white">
                  <div className="flex gap-2">
                    <input 
                      ref={inputRef}
                      type="text" 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)} 
                      onKeyPress={(e) => {if (e.key === 'Enter' && !e.shiftKey) {e.preventDefault(); handleSendMessage(input);}}} 
                      placeholder="Type your message..."
                      disabled={isTyping} 
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-950 disabled:bg-gray-50 text-slate-800"
                    />
                    <button onClick={() => handleSendMessage(input)} disabled={isTyping || !input.trim()} className="px-4 py-2 bg-blue-950 text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => {
            setShowLoginModal(false);
            setAuthRequired({ required: false, message: '' }); 
        }} 
        onLogin={handleLogin} 
        message={authRequired.message}
      />
    </>
  );
}