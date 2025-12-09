import React, { memo } from 'react';

interface AvatarProps {
  isUser: boolean;
  className?: string;
}

const Avatar = ({ isUser, className = '' }: AvatarProps) => {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
      isUser ? 'bg-blue-950 shadow-md' : 'bg-white border border-gray-200 shadow-sm'
    } ${className}`}>
      {isUser ? (
        // User Icon
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ) : (
        // Bot Icon (Custom Blue)
        <svg className="w-5 h-5 text-custom-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )}
    </div>
  );
};

export default memo(Avatar);