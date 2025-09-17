// components/QuickReplies.tsx
import React from 'react';

interface QuickRepliesProps {
  replies: string[];
  onReplyClick: (reply: string) => void;
  disabled?: boolean;
}

export default function QuickReplies({ replies, onReplyClick, disabled = false }: QuickRepliesProps) {
  if (!replies || replies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-2 pb-3">
      {replies.map((reply, index) => (
        <button
          key={index}
          onClick={() => onReplyClick(reply)}
          disabled={disabled}
          className="px-4 py-2 bg-white border border-sky-500 text-sky-500 rounded-full text-sm 
                     hover:bg-sky-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     shadow-sm hover:shadow-md"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}