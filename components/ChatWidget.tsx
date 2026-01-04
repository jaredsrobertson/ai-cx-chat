'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useChatStore } from '@/store/chatStore';
import { useChat } from '@/hooks/useChat';
import Message from './Message';
import QuickReplies from './QuickReplies';
import LoginModal from './LoginModal';
import AgentModal from './AgentModal';
import CloudIcon from './CloudIcon';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const { status } = useSession();

  const { 
    messages, 
    isTyping, 
    isAuthenticated, 
    authRequired, 
    setAuthRequired, 
    setAuthenticated, 
    pendingMessage,
    setPendingMessage, 
    isAgentModalOpen, 
    setAgentModalOpen
  } = useChatStore();

  const { sendMessage, triggerWelcome, resetConversation } = useChat();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update auth state when session changes
  useEffect(() => {
    if (status === 'authenticated') {
      setAuthenticated(true);
    } else if (status === 'unauthenticated') {
      setAuthenticated(false);
    }
  }, [status, setAuthenticated]);

  // Trigger welcome when chat opens
  useEffect(() => {
    if (isOpen) triggerWelcome();
  }, [isOpen, triggerWelcome]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (isOpen && !isTyping) inputRef.current?.focus();
  }, [messages, isOpen, isTyping]);

  // Show login modal when auth is required
  useEffect(() => {
    if (authRequired.required && !showLoginModal) {
      setShowLoginModal(true);
    }
  }, [authRequired, showLoginModal]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    setInput('');
    await sendMessage(text);
  };

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    setAuthRequired({ required: false, message: '' });
    setPendingMessage(null);
  };

  // Callback executed after successful login
  const handleLoginSuccess = async () => {
    console.log('Login success callback triggered');
    const messageToRetry = pendingMessage;
    
    if (!messageToRetry) {
      console.warn('No pending message to retry');
      return;
    }
    
    // Clear state
    setPendingMessage(null);
    setAuthRequired({ required: false, message: '' });
    
    console.log('Retrying message with authenticated session:', messageToRetry.substring(0, 50));
    
    // Retry the message (pass true to indicate this is an auth retry)
    await sendMessage(messageToRetry, true);
  };

  const lastBotMessage = [...messages].reverse().find(m => !m.isUser);
  const shouldShowQuickReplies = !isTyping && lastBotMessage?.quickReplies && lastBotMessage.quickReplies.length > 0;

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)} 
          className="fixed bottom-6 right-6 z-40 bg-blue-600 text-white rounded-full p-5 shadow-lg hover:bg-blue-700 transition-all hover:scale-110 animate-bounce"
        >
          <CloudIcon className="w-8 h-8" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-40 bg-blue-200 shadow-2xl flex flex-col w-screen h-screen sm:w-96 sm:h-[70vh] sm:max-h-[600px] sm:min-h-[400px] rounded-none sm:rounded-lg animate-fade-in-up">
          
          {/* Header */}
          <div className="bg-blue-950 text-white p-4 rounded-t-none sm:rounded-t-lg flex items-center justify-between shadow-md">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                <CloudIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">AI Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <p className="text-xs opacity-90">Online</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={resetConversation} 
                className="text-white hover:bg-white/20 rounded p-1 transition-colors" 
                title="Reset Chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-white hover:bg-white/20 rounded p-1 transition-colors" 
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="border-b border-gray-200 px-4 py-1.5 bg-gray-100 text-xs text-gray-600 flex justify-between items-center min-h-[28px]">
            <span className="flex items-center gap-1">
              {isAuthenticated ? (
                <><span className="text-green-600">●</span> Authenticated</>
              ) : (
                <><span className="text-gray-400">○</span> Guest</>
              )}
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <Message key={index} {...message} />
              ))}
              {isTyping && <Message text="" isUser={false} isTyping={true} />}
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
            
            {/* Input Area */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex gap-2">
                <input 
                  ref={inputRef}
                  type="text" 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(input);
                    }
                  }} 
                  placeholder="Ask about hours, balances, transfers..." 
                  disabled={isTyping} 
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-950 disabled:bg-gray-50 text-slate-800 placeholder-gray-400" 
                />
                <button 
                  onClick={() => handleSendMessage(input)} 
                  disabled={isTyping || !input.trim()} 
                  className="px-4 py-2 bg-blue-950 text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={handleCloseLoginModal}
        onSuccess={handleLoginSuccess}
        message={authRequired.message} 
      />
      <AgentModal 
        isOpen={isAgentModalOpen} 
        onClose={() => setAgentModalOpen(false)} 
      />
    </>
  );
}