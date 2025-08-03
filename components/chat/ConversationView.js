import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import ChatMessage from './ChatMessage';
import { HiPaperAirplane, HiMicrophone } from 'react-icons/hi2';
import { useAppStore } from '@/store/useAppStore';
import { useVoiceExperience } from '@/hooks/useVoiceExperience';
import { logger } from '@/lib/logger';

const ConversationView = forwardRef(function ConversationView({ activeBot, onAgentRequest }, ref) {
  const messages = useAppStore(state => state.messages);
  const loading = useAppStore(state => state.loading);
  const processMessage = useAppStore(state => state.processMessage);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const { isListening, startListening, stopListening } = useVoiceExperience();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeBot]);

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening((transcript) => {
        setInput(transcript);
        processMessage(transcript, activeBot);
        setInput('');
      });
    }
  }, [isListening, startListening, stopListening, processMessage, activeBot]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      processMessage(input, activeBot);
      setInput('');
    }
  }, [input, loading, processMessage, activeBot]);
  
  const currentMessages = messages[activeBot] || [];

  return (
    <div className="flex flex-col h-full bg-brand-ui-02 dark:bg-dark-brand-ui-02">
      <div className="flex-grow pl-2 pr-3 py-4 space-y-4 overflow-y-auto chat-messages" role="log">
        {currentMessages.map(msg => (
          <ChatMessage key={msg.id} {...msg} />
        ))}
        
        {loading && (
          <div className="flex justify-start px-2 py-1 ml-10">
            <div className="flex items-center space-x-2 text-sm text-brand-text-secondary">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="italic">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white dark:bg-dark-brand-ui-01 border-t border-brand-ui-03 dark:border-dark-brand-ui-03">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow p-2.5 border border-gray-300 dark:border-dark-brand-ui-03 dark:bg-dark-brand-ui-02 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-blue"
            disabled={loading}
            maxLength={1000}
            aria-label="Type your message"
          />
          <button
            type="button"
            onClick={handleMicClick}
            className={`p-2 rounded-full text-white transition-all ${
              isListening
                ? 'bg-red-500 animate-pulse shadow-lg'
                : 'bg-gray-400 hover:bg-gray-500 hover:shadow-md'
            }`}
            title={isListening ? 'Stop recording' : 'Start voice recording'}
            aria-label={isListening ? 'Stop voice recording' : 'Start voice recording'}
            disabled={loading}
          >
            <HiMicrophone className="w-4 h-4" />
          </button>
          <button
            type="submit"
            className="flex-shrink-0 p-2 bg-brand-blue text-white rounded-full hover:bg-brand-navy disabled:opacity-50 transition-all hover:shadow-md"
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <HiPaperAirplane className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
});

export default ConversationView;