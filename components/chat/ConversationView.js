import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import ChatMessage from './ChatMessage';
import { HiPaperAirplane, HiMicrophone } from 'react-icons/hi2';
import { useChat } from '@/hooks/useChat';
import { useTTS } from '@/contexts/TTSContext';
import { logger } from '@/lib/logger';

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

const ConversationView = forwardRef(function ConversationView({ activeBot, onLoginRequired, notificationAudioRef, onAgentRequest }, ref) {
  const { messages, loading, processMessage, retryLastMessage } = useChat(activeBot, onLoginRequired, notificationAudioRef, onAgentRequest);
  const { play, isAutoResponseEnabled } = useTTS();

  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messageCount = useRef(0);

  // Expose retry method to parent via ref
  useImperativeHandle(ref, () => ({
    retryLastMessage
  }));

  useEffect(() => {
    const currentMessages = messages[activeBot] || [];
    const lastMessage = currentMessages[currentMessages.length - 1];

    if (
      lastMessage?.author === 'bot' &&
      isAutoResponseEnabled &&
      currentMessages.length > messageCount.current
    ) {
      const textToSpeak = lastMessage.content.speakableText || lastMessage.content;
      if (textToSpeak) {
        play(textToSpeak, lastMessage.id);
      }
    }

    messageCount.current = currentMessages.length;
  }, [messages, activeBot, isAutoResponseEnabled, play]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeBot]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading, activeBot]);

  const setupSpeechRecognition = useCallback(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);

        if (transcript.trim()) {
          processMessage(transcript, activeBot);
          setInput('');
        }
      };

      recognition.onerror = (event) => {
        logger.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, [activeBot, processMessage]);

  useEffect(() => {
    setupSpeechRecognition();
  }, [setupSpeechRecognition]);

  const debouncedSpeechStart = useMemo(
    () => debounce(() => {
      if (recognitionRef.current && !isRecording) {
        recognitionRef.current.start();
        setIsRecording(true);
      }
    }, 300),
    [isRecording]
  );

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      debouncedSpeechStart();
    }
  }, [isRecording, debouncedSpeechStart]);

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
      <div className="flex-grow pl-2 pr-3 py-4 space-y-4 overflow-y-auto chat-messages" role="log" aria-label={`${activeBot} chat messages`}>
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
            ref={inputRef}
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
              isRecording
                ? 'bg-red-500 animate-pulse shadow-lg'
                : 'bg-gray-400 hover:bg-gray-500 hover:shadow-md'
            }`}
            title={isRecording ? 'Stop recording (click to stop)' : 'Start voice recording'}
            aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
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