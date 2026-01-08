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
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  // Mobile optimization: Prevent body scroll when chat is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [isOpen]);

  // Mobile keyboard handling: scroll input into view
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      // On mobile, when keyboard opens, scroll to bottom
      if (window.visualViewport && inputRef.current) {
        const visualViewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        
        // Keyboard is open if visual viewport is smaller
        if (visualViewportHeight < windowHeight) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }, 100);
        }
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

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
          className="fixed bottom-6 right-6 z-40 bg-blue-600 text-white rounded-full p-5 shadow-xl hover:bg-blue-700 hover:shadow-2xl transition-all hover:scale-105"
        >
          <CloudIcon className="w-8 h-8" />
          {/* Pulsing Notification Dot */}
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
          </span>
        </button>
      )}

      {/* Chat Window - Mobile Optimized */}
      {isOpen && (
        <>
          {/* Mobile: Solid overlay background to prevent page showing through */}
          <div className="fixed inset-0 z-40 bg-gradient-to-b from-slate-200 to-blue-200 sm:hidden" />
          
          {/* Chat Container */}
          <div 
            ref={chatContainerRef}
            className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 shadow-2xl flex flex-col w-full h-full sm:w-96 sm:h-[70vh] sm:max-h-[600px] sm:min-h-[400px] sm:rounded-2xl overflow-hidden animate-fade-in-up bg-gradient-to-b from-slate-200 to-blue-200 sm:border sm:border-gray-300/50"
          >
            
            {/* Header - Solid, no transparency */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 flex items-center justify-between shadow-lg flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                  <CloudIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">AI Assistant</h3>
                  <p className="text-xs text-blue-100">Ready to help</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={resetConversation} 
                  className="text-white/90 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all" 
                  title="Reset Chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="text-white/90 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all" 
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Status Bar - Solid background */}
            <div className="border-b border-gray-300 px-4 py-2 bg-white/95 flex-shrink-0">
              <span className="flex items-center gap-2 text-xs text-gray-700">
                {isAuthenticated ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="font-medium">Authenticated</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                    <span>Guest</span>
                  </>
                )}
              </span>
            </div>

            {/* Messages Area - Scrollable with proper mobile height */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 min-h-0">
              {messages.map((message, index) => (
                <Message key={index} {...message} />
              ))}
              {isTyping && <Message text="" isUser={false} isTyping={true} />}
              {shouldShowQuickReplies && lastBotMessage?.quickReplies && (
                <QuickReplies 
                  replies={lastBotMessage.quickReplies} 
                  onReplyClick={handleSendMessage} 
                  disabled={isTyping} 
                />
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Area - Solid background, safe area for mobile keyboard */}
            <div className="border-t border-gray-300 p-4 bg-white flex-shrink-0 safe-area-inset-bottom">
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
                  onFocus={() => {
                    // Scroll to bottom when input is focused (mobile keyboard opens)
                    setTimeout(() => {
                      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }, 300);
                  }}
                  placeholder="Type your message..." 
                  disabled={isTyping} 
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 text-gray-800 placeholder-gray-400 transition-all text-base" 
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                />
                <button 
                  onClick={() => handleSendMessage(input)} 
                  disabled={isTyping || !input.trim()} 
                  className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
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