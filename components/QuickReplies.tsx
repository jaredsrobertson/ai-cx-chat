// components/QuickReplies.tsx
import React from 'react';

type QuickReply = string | { display: string; payload: string };

interface QuickRepliesProps {
  replies: QuickReply[];
  onReplyClick: (payload: string) => void;
  disabled?: boolean;
}

export default function QuickReplies({ replies, onReplyClick, disabled = false }: QuickRepliesProps) {
  if (!replies || replies.length === 0) {
    return null;
  }

  // Remove emojis from display text
  const stripEmojis = (text: string): string => {
    return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2 justify-end pr-3">
      {replies.map((reply, index) => {
        const display = typeof reply === 'string' ? reply : reply.display;
        const payload = typeof reply === 'string' ? reply : reply.payload;
        const cleanDisplay = stripEmojis(display);

        return (
          <button
            key={index}
            onClick={() => onReplyClick(payload)}
            disabled={disabled}
            className="px-3 py-1.5 bg-white border border-blue-950 text-blue-950 rounded-full text-xs font-medium
                       hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {cleanDisplay}
          </button>
        );
      })}
    </div>
  );
}