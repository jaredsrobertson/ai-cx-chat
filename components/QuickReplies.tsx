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
    <div className="flex flex-wrap gap-2 mt-2 ml-10">
      {replies.map((reply, index) => (
        <button
          key={index}
          onClick={() => onReplyClick(reply)}
          disabled={disabled}
          className="px-3 py-1 bg-white border border-sky-500 text-sky-500 rounded-full text-sm 
                     hover:bg-sky-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}