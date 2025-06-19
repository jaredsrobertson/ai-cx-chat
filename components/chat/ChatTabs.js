import { useRef, useEffect, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatMessage from './ChatMessage';
import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';

export default function ChatTabs({ activeTab, setActiveTab, isTtsEnabled, setIsTtsEnabled, onLoginRequired }) {
  const { messages, inputMessage, isLoading, setInputMessage, handleSendMessage } = useChat(activeTab, onLoginRequired, isTtsEnabled);
  const messagesEndRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Effect to scroll to the bottom of the chat on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Effect to set up the Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    };

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setInputMessage(prev => (prev + ' ' + finalTranscript).trim());
      }
    };
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
  }, [setInputMessage]);

  const handleToggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Tabs for switching between bots */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        <button onClick={() => setActiveTab('banking')} className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'banking' ? 'border-banking-blue text-banking-blue bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>SecureBank Concierge</button>
        <button onClick={() => setActiveTab('advisor')} className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'advisor' ? 'border-green-500 text-green-600 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>AI Advisor</button>
      </div>

      {/* Message display area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 chat-messages overscroll-contain">
        {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
        {isLoading && <div className="chat-message bot"><div className="flex items-center space-x-2"><div className="flex space-x-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div></div><span className="text-xs text-gray-500">Typing...</span></div></div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Redesigned Input Footer */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <button onClick={handleToggleListening} className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-gray-500 hover:bg-gray-100'}`} aria-label="Use voice input">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" /></svg>
          </button>
          <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask a question..." className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-banking-blue outline-none text-sm transition-shadow" disabled={isLoading} />
          <button onClick={() => handleSendMessage()} disabled={!inputMessage.trim() || isLoading} className="p-2.5 bg-banking-blue text-white rounded-full hover:bg-banking-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Send Message">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}