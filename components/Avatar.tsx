import React, { memo } from 'react';

interface AvatarProps {
  isUser: boolean;
  className?: string;
}

const Avatar = ({ isUser, className = '' }: AvatarProps) => {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
      isUser ? 'bg-blue-950 shadow-md' : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-md'
    } ${className}`}>
      {isUser ? (
        // User Icon
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ) : (
        // Bot Icon - Sparkle/AI Assistant
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )}
    </div>
  );
};

export default memo(Avatar);