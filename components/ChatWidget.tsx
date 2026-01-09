'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useChatStore } from '@/store/chatStore';
import { useChat } from '@/hooks/useChat';
import { useChatScroll } from '@/hooks/useChatScroll';
import Message from './Message';
import QuickReplies from './QuickReplies';
import LoginModal from './LoginModal';
import AgentModal from './AgentModal';
import CloudIcon from './CloudIcon';
import { STANDARD_QUICK_REPLIES } from '@/lib/chat-constants';

// ============================================
// STANDALONE COMPONENTS
// ============================================

interface ChatHeaderProps {
  resetConversation: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

const ChatHeader = ({ resetConversation, setIsOpen }: ChatHeaderProps) => (
  <>
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
        <CloudIcon className="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">AI Assistant</h3>
        <p className="text-[10px] text-blue-100 leading-tight">Ready to help</p>
      </div>
    </div>
    <div className="flex items-center gap-1">
      <button 
        onClick={resetConversation} 
        className="text-white/90 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all" 
        title="Reset Chat"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
      <button 
        onClick={() => setIsOpen(false)} 
        className="text-white/90 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all" 
        title="Close"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </>
);

const ChatStatus = ({ isAuthenticated }: { isAuthenticated: boolean }) => (
  <span className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
    {isAuthenticated ? (
      <>
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
        <span>Authenticated</span>
      </>
    ) : (
      <>
        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
        <span>Guest</span>
      </>
    )}
  </span>
);

interface ChatMessagesProps {
  messages: any[];
  isTyping: boolean;
  lastBotMessage: any;
  handleSendMessage: (text: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

const ChatMessages = ({ 
  messages, 
  isTyping, 
  lastBotMessage, 
  handleSendMessage, 
  scrollRef,
  bottomRef
}: ChatMessagesProps) => {
  const shouldShowQuickReplies = !isTyping && lastBotMessage?.quickReplies && lastBotMessage.quickReplies.length > 0;

  return (
    <div 
      ref={scrollRef} 
      className="p-4"
      style={{ 
        flex: '1 1 0%', // Explicit flex shorthand
        overflowY: 'scroll',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        minHeight: 0 // Critical for flex child with overflow
      }}
    >
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
      
      {/* ANCHOR DIV FOR SCROLLING */}
      <div ref={bottomRef} className="h-px w-full" />
      
      {/* Bottom padding */}
      <div style={{ height: '20px' }} />
    </div>
  );
};

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSendMessage: (text: string) => void;
  isTyping: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const ChatInput = ({ input, setInput, handleSendMessage, isTyping, inputRef }: ChatInputProps) => (
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
      placeholder="Type your message..."
      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 text-gray-800 placeholder-gray-400 transition-all text-sm" 
      inputMode="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="sentences"
    />
    <button 
      onClick={() => handleSendMessage(input)} 
      disabled={isTyping || !input.trim()} 
      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center flex-shrink-0"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    </button>
  </div>
);

// ============================================
// MAIN WIDGET COMPONENT
// ============================================

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Animation States for FAB
  const [fabVisible, setFabVisible] = useState(false);
  const [fabFlash, setFabFlash] = useState(false);
  const [fabPingLoop, setFabPingLoop] = useState(false);

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
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Get last bot message for quick replies
  const lastBotMessage = [...messages].reverse().find(m => !m.isUser);

  // Use the scroll hook
  const { scrollRef, bottomRef, scrollToBottom } = useChatScroll([
    messages.length,
    isTyping,
    lastBotMessage?.quickReplies?.length || 0,
  ]);

  // Animation Sequence on Mount
  useEffect(() => {
    const timer1 = setTimeout(() => setFabVisible(true), 1300);
    const timer2 = setTimeout(() => setFabFlash(true), 2300);
    const timer3 = setTimeout(() => setFabFlash(false), 3000);
    const timer4 = setTimeout(() => setFabPingLoop(true), 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      setAuthenticated(true);
    } else if (status === 'unauthenticated') {
      setAuthenticated(false);
    }
  }, [status, setAuthenticated]);

  useEffect(() => {
    if (isOpen) triggerWelcome();
  }, [isOpen, triggerWelcome]);

  useEffect(() => {
    if (authRequired.required && !showLoginModal) {
      setShowLoginModal(true);
    }
  }, [authRequired, showLoginModal]);

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    setInput('');
    
    if (inputRef.current) {
      inputRef.current.focus();
    }

    scrollToBottom('smooth');
    await sendMessage(text);
    
    // Extra scrolls on mobile (use 'auto' for race-condition safe snapping)
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      setTimeout(() => scrollToBottom('auto'), 200);
      setTimeout(() => scrollToBottom('auto'), 400);
    }
  };

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    setAuthRequired({ required: false, message: '' });
    setPendingMessage(null);
  };

  const handleLoginSuccess = async () => {
    const messageToRetry = pendingMessage;
    
    if (!messageToRetry) return;
    
    setPendingMessage(null);
    setAuthRequired({ required: false, message: '' });
    
    await sendMessage(messageToRetry, true);
  };

  return (
    <>
      <style jsx global>{`
        @keyframes fab-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); filter: brightness(1.2); }
          100% { transform: scale(1); }
        }
        .animate-fab-pop {
          animation: fab-pop 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}</style>

      {/* FAB */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)} 
          className={`fixed bottom-6 right-6 z-40 bg-blue-600 text-white rounded-full p-5 shadow-xl hover:bg-blue-700 hover:shadow-2xl transition-all duration-1000 ease-out hover:scale-105 
            ${fabVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
            ${fabFlash ? 'animate-fab-pop' : ''}
          `}
        >
          <CloudIcon className="w-8 h-8" />
          
          {fabPingLoop && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <>
          {/* MOBILE: Fullscreen with explicit height calculations */}
          <div 
            className="lg:hidden fixed bg-white"
            style={{
              inset: 0,
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              // FIX #2: Use 100dvh to account for browser address bar on mobile
              height: '100dvh',
              maxHeight: '-webkit-fill-available'
            }}
          >
            {/* Header - Fixed height */}
            <div 
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 flex items-center justify-between shadow-md"
              style={{ flexShrink: 0 }}
            >
              <ChatHeader resetConversation={resetConversation} setIsOpen={setIsOpen} />
            </div>

            {/* Status - Fixed height */}
            <div 
              className="border-b border-gray-300 px-4 py-1.5 bg-gray-50/95"
              style={{ flexShrink: 0 }}
            >
              <ChatStatus isAuthenticated={isAuthenticated} />
            </div>

            {/* Messages - SCROLLABLE, takes remaining space */}
            <ChatMessages 
              messages={messages} 
              isTyping={isTyping} 
              lastBotMessage={lastBotMessage} 
              handleSendMessage={handleSendMessage} 
              scrollRef={scrollRef}
              bottomRef={bottomRef}
            />

            {/* Input - Fixed height */}
            <div 
              className="border-t border-gray-300 p-2 bg-white safe-bottom"
              style={{ flexShrink: 0 }}
            >
              <ChatInput 
                input={input} 
                setInput={setInput} 
                handleSendMessage={handleSendMessage} 
                isTyping={isTyping} 
                inputRef={inputRef} 
              />
            </div>
          </div>

          {/* DESKTOP: Floating Widget */}
          <div className="hidden lg:block fixed bottom-6 right-6 z-50 w-96 h-[70vh] max-h-[600px] min-h-[400px] rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-b from-slate-200 to-blue-200 border border-gray-300/50">
            <div className="flex flex-col h-full">
              <div className="flex-none bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-lg rounded-t-2xl">
                <ChatHeader resetConversation={resetConversation} setIsOpen={setIsOpen} />
              </div>

              <div className="flex-none border-b border-gray-300 px-4 py-1.5 bg-gray-50/95">
                <ChatStatus isAuthenticated={isAuthenticated} />
              </div>

              <ChatMessages 
                messages={messages} 
                isTyping={isTyping} 
                lastBotMessage={lastBotMessage} 
                handleSendMessage={handleSendMessage} 
                scrollRef={scrollRef}
                bottomRef={bottomRef}
              />

              <div className="flex-none border-t border-gray-300 p-3 bg-white">
                <ChatInput 
                  input={input} 
                  setInput={setInput} 
                  handleSendMessage={handleSendMessage} 
                  isTyping={isTyping} 
                />
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