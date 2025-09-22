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
  if (!replies || replies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2 ml-10">
      {replies.map((reply, index) => {
        const display = typeof reply === 'string' ? reply : reply.display;
        const payload = typeof reply === 'string' ? reply : reply.payload;

        return (
          <button
            key={index}
            onClick={() => onReplyClick(payload)}
            disabled={disabled}
            className="px-3 py-1 bg-white border border-[#3a8bc2] text-[#3a8bc2] rounded-full text-sm 
                       hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {display}
          </button>
        );
      })}
    </div>
  );
}