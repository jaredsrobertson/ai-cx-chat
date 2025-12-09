import React, { memo } from 'react';
import { Source } from '@/types';
import Avatar from './Avatar';

interface MessageProps {
  text: string;
  isUser: boolean;
  timestamp?: Date;
  isTyping?: boolean;
  sources?: Source[];
}

function MessageComponent({ text, isUser, timestamp, isTyping, sources }: MessageProps) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in-up`}>
      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        
        <div className={`flex items-end ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          
          <div className={`flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'}`}>
            <Avatar isUser={isUser} />
          </div>

          <div className={`relative px-4 py-3 shadow-sm ${
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
          </div>
        </div>

        {!isUser && sources && sources.length > 0 && (
          <div className="mt-2 ml-12 bg-blue-50 border border-blue-100 rounded-lg p-3 w-full animate-fade-in-up">
            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Sources
            </p>
            <div className="space-y-2">
              {sources.map((source, idx) => (
                <div key={idx} className="text-xs bg-white p-2 rounded border border-blue-100 shadow-sm">
                  <div className="font-medium text-blue-900 mb-0.5">{source.title}</div>
                  <p className="text-gray-600 leading-tight line-clamp-2">{source.excerpt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {timestamp && !isTyping && (
          <div className={`text-[10px] mt-1 opacity-60 ${isUser ? 'mr-1' : 'ml-12'} text-gray-500`}>
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

      </div>
    </div>
  );
}

export default memo(MessageComponent);