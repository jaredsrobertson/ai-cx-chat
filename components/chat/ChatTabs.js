import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ChatMessage from './ChatMessage';
import { PaperAirplaneIcon, MicrophoneIcon } from '../ui/Icons';
import { useChat } from '../../hooks/useChat';
import { useTTS } from '../../contexts/TTSContext';
import { logger } from '../../lib/utils';

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

export default function ChatTabs({ activeTab, setActiveTab, onLoginRequired, notificationAudioRef }) {
  const { messages, loading, processMessage } = useChat(activeTab, onLoginRequired, notificationAudioRef);
  const { play, isAutoResponseEnabled } = useTTS();
  
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messageCounts = useRef({ banking: 0, advisor: 0 });

  useEffect(() => {
    const currentMessages = messages[activeTab] || [];
    const lastMessage = currentMessages[currentMessages.length - 1];

    if (
      activeTab === 'banking' &&
      isAutoResponseEnabled &&
      lastMessage?.author === 'bot' &&
      currentMessages.length > messageCounts.current[activeTab]
    ) {
      const textToSpeak = lastMessage.content.speakableText || lastMessage.content;
      if (textToSpeak) {
        play(textToSpeak, lastMessage.id);
      }
    }
    
    messageCounts.current[activeTab] = currentMessages.length;
  }, [messages, activeTab, isAutoResponseEnabled, play]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

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
          processMessage(transcript, activeTab);
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
  }, [activeTab, processMessage]);

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
      processMessage(input, activeTab);
      setInput('');
    }
  }, [input, loading, processMessage, activeTab]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => setActiveTab('banking')}
          className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'banking' 
              ? 'border-banking-blue text-banking-blue bg-blue-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          aria-label="Switch to SecureBank Concierge"
        >
          SecureBank Concierge
        </button>
        <button
          onClick={() => setActiveTab('advisor')}
          className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'advisor' 
              ? 'border-green-500 text-green-600 bg-green-50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          aria-label="Switch to AI Advisor"
        >
          AI Advisor
        </button>
      </div>
      <div className="flex-grow px-2 py-4 space-y-4 overflow-y-auto chat-messages" role="log" aria-label="Chat messages">
        {messages[activeTab].map(msg => (
          <ChatMessage key={msg.id} {...msg} />
        ))}
        {loading && (
          <div className="chat-message bot" role="status" aria-label="Assistant is typing">
            <div className="message-content bg-white p-3 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow p-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-banking-blue"
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
            <MicrophoneIcon className="w-4 h-4" />
          </button>
          <button
            type="submit"
            className="p-2 bg-banking-blue text-white rounded-full hover:bg-banking-navy disabled:bg-gray-300 transition-all hover:shadow-md"
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}