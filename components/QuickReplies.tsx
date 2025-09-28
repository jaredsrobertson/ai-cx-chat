// components/QuickReplies.tsx
import React from 'react';

// A QuickReply can be a simple string or an object with display and payload
type QuickReply = string | { display: string; payload: string };

interface QuickRepliesProps {
  replies: QuickReply[];
  onReplyClick: (payload: string) => void;
  disabled?: boolean;
}

export default function QuickReplies({ replies, onReplyClick, disabled = false }: QuickRepliesProps) {
  console.log('QuickReplies rendering with:', { replies, disabled });
  
  if (!replies || replies.length === 0) {
    console.log('No replies to show');
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2 ml-10">
      {replies.map((reply, index) => {
        const display = typeof reply === 'string' ? reply : reply.display;
        const payload = typeof reply === 'string' ? reply : reply.payload;

        return (
          <button
            key={index}
            onClick={() => {
              console.log('Quick reply clicked:', payload);
              onReplyClick(payload);
            }}
            disabled={disabled}
            className="px-3 py-1 bg-white border border-blue-950 text-blue-950 rounded-full text-sm 
                       hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {display}
          </button>
        );
      })}
    </div>
  );
}