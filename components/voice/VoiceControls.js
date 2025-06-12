import { useState, useRef } from 'react';

export default function VoiceControls({ activeTab }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      
      // Trigger input event to the chat
      const inputEvent = new CustomEvent('voiceInput', { 
        detail: { 
          transcript,
          tab: activeTab 
        } 
      });
      window.dispatchEvent(inputEvent);
      
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  if (!isSupported) {
    return (
      <div className="p-2 text-center">
        <span className="text-xs text-gray-500">
          Voice input not supported in this browser
        </span>
      </div>
    );
  }

  return (
    <div className="absolute bottom-16 right-4 flex items-center space-x-2">
      <button
        onClick={isListening ? stopListening : startListening}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 voice-recording' 
            : 'bg-banking-blue hover:bg-banking-navy'
        } text-white shadow-lg`}
        title={isListening ? 'Stop recording' : 'Start voice input'}
      >
        {isListening ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      
      {isListening && (
        <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs animate-pulse">
          Listening...
        </div>
      )}
    </div>
  );
}