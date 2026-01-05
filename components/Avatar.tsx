import React, { memo } from 'react';

interface AvatarProps {
  isUser: boolean;
  className?: string;
}

const Avatar = ({ isUser, className = '' }: AvatarProps) => {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
      isUser 
        ? 'bg-blue-600 shadow-md ring-2 ring-blue-100' 
        : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-md ring-2 ring-blue-100'
    } ${className}`}>
      {isUser ? (
        // User Icon
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ) : (
        // Bot Icon - Cloud
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.5 4.5 0 0 0 2.25 15Z" />
        </svg>
      )}
    </div>
  );
};

export default memo(Avatar);