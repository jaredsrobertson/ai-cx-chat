import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { HiOutlineUserGroup } from 'react-icons/hi2';

export default function Handoff({ messageHistory, onCancel }) {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const generateSummary = async () => {
      setIsLoading(true);

      const hasMeaningfulHistory = Array.isArray(messageHistory) && messageHistory.length > 1;

      if (!hasMeaningfulHistory) {
        setSummary("You'll be connected to the next available agent.");
        setIsLoading(false);
        return;
      }

      const serializableHistory = messageHistory.map(msg => {
        const contentText = (typeof msg.content === 'object' && msg.content !== null)
          ? msg.content.speakableText || ''
          : msg.content;
        
        return {
          author: msg.author,
          content: contentText,
        };
      });

      try {
        const response = await fetch('/api/chat/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: serializableHistory, user }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch summary');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let content = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          content += decoder.decode(value, { stream: true });
        }
        setSummary(content);
      } catch (error) {
        console.error("Summary generation failed:", error);
        setSummary("Could not generate a summary. Please describe your issue to the agent.");
      } finally {
        setIsLoading(false);
      }
    };

    generateSummary();
  }, [messageHistory, user]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-brand-ui-02 text-center">
      <div className="w-16 h-16 bg-brand-blue/10 text-brand-blue rounded-full flex items-center justify-center mb-4">
        <HiOutlineUserGroup className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-brand-text-primary mb-2">Connecting to an Agent</h2>
      <p className="text-brand-text-secondary mb-6">An agent will be with you shortly. Please review this summary of your request.</p>
      
      <div className="w-full max-w-sm p-4 bg-white rounded-lg border border-brand-ui-03 text-left">
        <h3 className="text-sm font-bold text-brand-text-primary mb-2">Summary for Agent:</h3>
        {isLoading ? (
          <div className="flex items-center space-x-2 text-sm text-brand-text-secondary">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <span>Generating...</span>
          </div>
        ) : (
          <p className="text-sm text-brand-text-secondary italic">{summary}</p>
        )}
      </div>

      <button
        onClick={onCancel}
        className="mt-6 text-sm text-brand-blue hover:underline"
      >
        Cancel and return to chat
      </button>
    </div>
  );
}