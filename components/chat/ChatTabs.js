import { useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatMessage from './ChatMessage'; 

export default function ChatTabs({ activeTab, onLoginRequired }) {
  const { messages, inputMessage, isLoading, setInputMessage, handleSendMessage } = useChat(activeTab, onLoginRequired);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const handleVoiceInput = (event) => {
      // Ensure the voice input is for the currently active tab
      if (event.detail.tab === activeTab) {
        setInputMessage(event.detail.transcript);
        // Use a timeout to allow the input field to update before sending
        setTimeout(() => handleSendMessage(event.detail.transcript), 100);
      }
    };

    window.addEventListener('voiceInput', handleVoiceInput);
    return () => {
      window.removeEventListener('voiceInput', handleVoiceInput);
    };
  }, [activeTab, setInputMessage, handleSendMessage]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full max-h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 chat-messages">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {isLoading && (
          <div className="chat-message bot">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs text-gray-500">Typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            className="w-full pl-3 pr-12 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-banking-blue focus:border-transparent outline-none text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 bg-banking-blue text-white rounded-md hover:bg-banking-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send Message"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.105 3.105a1 1 0 011.414 0L16 14.586V10a1 1 0 112 0v7a1 1 0 01-1 1h-7a1 1 0 110-2h4.586L3.105 4.519a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}