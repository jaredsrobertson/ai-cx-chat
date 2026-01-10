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
    // UPDATED: Reduced mt-3 to mt-1 (less gap above)
    <div className="flex flex-wrap gap-2 mt-1 justify-end px-2">
      {replies.map((reply, index) => {
        const display = typeof reply === 'string' ? reply : reply.display;
        const payload = typeof reply === 'string' ? reply : reply.payload;
        const cleanDisplay = stripEmojis(display);

        return (
          <button
            key={index}
            onClick={() => onReplyClick(payload)}
            disabled={disabled}
            // UPDATED: Reduced py-1.5 to py-1 (less tall)
            className="px-3 py-1 bg-white border border-blue-200 text-blue-700 rounded-full text-xs font-medium
                       hover:bg-blue-50 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
          >
            {cleanDisplay}
          </button>
        );
      })}
    </div>
  );
}