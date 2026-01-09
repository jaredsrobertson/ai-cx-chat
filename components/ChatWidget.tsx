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
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const ChatMessages = ({ 
  messages, 
  isTyping, 
  lastBotMessage, 
  handleSendMessage, 
  messagesEndRef 
}: ChatMessagesProps) => {
  const shouldShowQuickReplies = !isTyping && lastBotMessage?.quickReplies && lastBotMessage.quickReplies.length > 0;

  return (
    <>
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
    </>
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
      disabled={isTyping} 
      // REDUCED PADDING: px-4 py-3 -> px-3 py-2
      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 text-gray-800 placeholder-gray-400 transition-all text-sm" 
      inputMode="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="sentences"
    />
    <button 
      onClick={() => handleSendMessage(input)} 
      disabled={isTyping || !input.trim()} 
      // REDUCED PADDING: px-5 py-3 -> px-3 py-2
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
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [messages]);

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
    await sendMessage(text);
  };

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    setAuthRequired({ required: false, message: '' });
    setPendingMessage(null);
  };

  const handleLoginSuccess = async () => {
    console.log('Login success callback triggered');
    const messageToRetry = pendingMessage;
    
    if (!messageToRetry) {
      console.warn('No pending message to retry');
      return;
    }
    
    setPendingMessage(null);
    setAuthRequired({ required: false, message: '' });
    
    console.log('Retrying message with authenticated session:', messageToRetry.substring(0, 50));
    await sendMessage(messageToRetry, true);
  };

  const lastBotMessage = [...messages].reverse().find(m => !m.isUser);

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)} 
          className="fixed bottom-6 right-6 z-40 bg-blue-600 text-white rounded-full p-5 shadow-xl hover:bg-blue-700 hover:shadow-2xl transition-all hover:scale-105"
        >
          <CloudIcon className="w-8 h-8" />
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <>
          {/* MOBILE / LANDSCAPE: Fullscreen Flex Layout */}
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col h-[100dvh] bg-white">
            
            {/* Header - REDUCED PADDING: py-4 -> py-2 */}
            <div className="flex-none bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 flex items-center justify-between shadow-md">
              <ChatHeader resetConversation={resetConversation} setIsOpen={setIsOpen} />
            </div>

            {/* Status */}
            <div className="flex-none border-b border-gray-300 px-4 py-1.5 bg-gray-50/95">
              <ChatStatus isAuthenticated={isAuthenticated} />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 scroll-smooth">
              <ChatMessages 
                messages={messages} 
                isTyping={isTyping} 
                lastBotMessage={lastBotMessage} 
                handleSendMessage={handleSendMessage} 
                messagesEndRef={messagesEndRef} 
              />
            </div>

            {/* Input - REDUCED PADDING: p-4 -> p-2 */}
            <div className="flex-none border-t border-gray-300 p-2 bg-white safe-bottom">
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
              {/* Header - REDUCED PADDING: py-4 -> py-3 */}
              <div className="flex-none bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-lg rounded-t-2xl">
                <ChatHeader resetConversation={resetConversation} setIsOpen={setIsOpen} />
              </div>

              {/* Status */}
              <div className="flex-none border-b border-gray-300 px-4 py-1.5 bg-gray-50/95">
                <ChatStatus isAuthenticated={isAuthenticated} />
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 min-h-0">
                <ChatMessages 
                  messages={messages} 
                  isTyping={isTyping} 
                  lastBotMessage={lastBotMessage} 
                  handleSendMessage={handleSendMessage} 
                  messagesEndRef={messagesEndRef} 
                />
              </div>

              {/* Input - REDUCED PADDING: p-4 -> p-3 */}
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