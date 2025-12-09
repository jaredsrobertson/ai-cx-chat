import React, { memo } from 'react';

interface MessageProps {
  text: string;
  isUser: boolean;
  timestamp?: Date;
  isTyping?: boolean;
}

function MessageComponent({ text, isUser, timestamp, isTyping }: MessageProps) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in-up`}>
      <div className={`flex items-end max-w-[85%] sm:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-blue-950 shadow-md' : 'bg-white border border-gray-200 shadow-sm'
          }`}>
            {isUser ? (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-custom-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        </div>

        {/* Message bubble */}
        <div className={`relative px-4 py-2.5 shadow-sm ${
            isUser 
              ? 'bg-blue-950 text-white rounded-2xl rounded-br-none' 
              : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-none'
          }`}>
            {isTyping ? (
              <div className="flex space-x-1 h-5 items-center px-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{text}</div>
            )}
            
            {timestamp && !isTyping && (
              <div className={`text-[10px] mt-1 opacity-70 ${isUser ? 'text-blue-100' : 'text-gray-400'}`}>
                {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when parent state changes but props don't
export default memo(MessageComponent);