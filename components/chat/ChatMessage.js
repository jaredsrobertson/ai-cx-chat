import { HiOutlineSpeakerWave, HiOutlineExclamationTriangle } from 'react-icons/hi2';
import ConfidentialDisplay from './ConfidentialDisplay';
import { useTTS } from '@/contexts/TTSContext';
import React, { memo } from 'react';

const Avatar = () => (
  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-banking-navy flex-shrink-0">
    <span className="text-xl" role="img" aria-label="Robot assistant">🤖</span>
  </div>
);

const SpeakButton = memo(({ textToSpeak, messageId }) => {
  const { play, stop, retryPlay, nowPlayingId, isLoading, error } = useTTS();
  const isThisMessagePlaying = nowPlayingId === messageId;

  const handleSpeakButtonClick = () => {
    if (isThisMessagePlaying) {
      stop();
    } else {
      play(textToSpeak, messageId);
    }
  };

  const handleRetry = () => {
    retryPlay(textToSpeak, messageId);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSpeakButtonClick();
    }
  };

  return (
    <div className="flex items-center gap-1">
      {error && nowPlayingId === messageId && (
        <button
          onClick={handleRetry}
          className="text-xs text-red-500 hover:text-red-700 underline"
          title="Retry audio playback"
          aria-label="Retry audio playback"
        >
          Retry
        </button>
      )}
      <button
        onClick={handleSpeakButtonClick}
        onKeyDown={handleKeyDown}
        className={`p-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-banking-blue focus:ring-opacity-50 ${
          isThisMessagePlaying
            ? 'text-blue-500 bg-blue-100'
            : isLoading && nowPlayingId === messageId
              ? 'text-gray-400 cursor-wait'
              : error && nowPlayingId === messageId
                ? 'text-red-500 bg-red-50'
                : 'text-gray-400 hover:bg-gray-200 hover:text-banking-blue'
        }`}
        aria-label={
          isThisMessagePlaying
            ? "Stop reading message aloud"
            : isLoading && nowPlayingId === messageId
              ? "Loading audio..."
              : error && nowPlayingId === messageId
                ? "Audio failed - click to retry"
                : "Read message aloud"
        }
        disabled={isLoading && nowPlayingId === messageId}
        tabIndex={0}
      >
        {isLoading && nowPlayingId === messageId ? (
          <div
            className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        ) : error && nowPlayingId === messageId ? (
          <HiOutlineExclamationTriangle className="w-4 h-4" aria-hidden="true" />
        ) : (
          <HiOutlineSpeakerWave className="w-4 h-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
});

function ChatMessage({ id, author, type, content, timestamp }) {
  const isUser = author === 'user';

  const getSafeContent = (rawContent) => {
    if (typeof rawContent === 'object' && rawContent !== null && !Array.isArray(rawContent)) {
      return rawContent.speakableText || JSON.stringify(rawContent, null, 2);
    }
    return rawContent || '';
  };

  const textContent = getSafeContent(content);

  if (isUser) {
    return (
      <div className="flex justify-end my-2" role="group" aria-label="User message">
        <div className="chat-message user">
          <p className="text-sm whitespace-pre-wrap">{textContent}</p>
          <span className="text-xs opacity-70 mt-1 block text-right">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 my-2" role="group" aria-label="Assistant message">
      <Avatar />
      <div className="chat-message bot">
        <p className="text-sm whitespace-pre-wrap">{textContent}</p>

        {type === 'structured' && content.confidentialData && (
          <ConfidentialDisplay data={content.confidentialData} />
        )}

        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs opacity-70">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <SpeakButton textToSpeak={textContent} messageId={id} />
        </div>
      </div>
    </div>
  );
}

export default memo(ChatMessage);