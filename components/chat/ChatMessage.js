import { SpeakerWaveIcon } from '../ui/Icons';
import ConfidentialDisplay from './ConfidentialDisplay';
import { useTTS } from '../../contexts/TTSContext';
import React, { memo } from 'react';

const Avatar = () => (
  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-banking-navy flex-shrink-0">
    <span className="text-xl" role="img" aria-label="Robot assistant">🤖</span>
  </div>
);

function ChatMessage({ id, author, type, content, timestamp }) {
  const { play, stop, retryPlay, nowPlayingId, isLoading, error } = useTTS();
  const isUser = author === 'user';
  
  const getSafeContent = (rawContent) => {
    if (typeof rawContent === 'object' && rawContent !== null && !Array.isArray(rawContent)) {
      return rawContent.speakableText || JSON.stringify(rawContent, null, 2);
    }
    return rawContent || '';
  };

  const textToSpeak = getSafeContent(content);
  const isThisMessagePlaying = nowPlayingId === id;

  const handleSpeakButtonClick = () => {
    if (isThisMessagePlaying) {
      stop();
    } else {
      play(textToSpeak, id);
    }
  };

  const handleRetry = () => {
    retryPlay(textToSpeak, id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSpeakButtonClick();
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end my-2" role="group" aria-label="User message">
        <div className="chat-message user">
          <p className="text-sm whitespace-pre-wrap">{getSafeContent(content)}</p>
          <span className="text-xs opacity-70 mt-1 block text-right">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 my-2" role="group" aria-label="Assistant message">
      <Avatar />
      <div className="chat-message bot">
        <p className="text-sm whitespace-pre-wrap">{textToSpeak}</p>
        
        {type === 'structured' && content.confidentialData && (
          <ConfidentialDisplay data={content.confidentialData} />
        )}
        
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs opacity-70">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          
          <div className="flex items-center gap-1">
            {error && nowPlayingId === id && (
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
                  : isLoading && nowPlayingId === id
                    ? 'text-gray-400 cursor-wait'
                    : error && nowPlayingId === id
                      ? 'text-red-500 bg-red-50'
                      : 'text-gray-400 hover:bg-gray-200 hover:text-banking-blue'
              }`}
              aria-label={
                isThisMessagePlaying 
                  ? "Stop reading message aloud" 
                  : isLoading && nowPlayingId === id
                    ? "Loading audio..."
                    : error && nowPlayingId === id
                      ? "Audio failed - click to retry"
                      : "Read message aloud"
              }
              disabled={isLoading && nowPlayingId === id}
              tabIndex={0}
            >
              {isLoading && nowPlayingId === id ? (
                <div 
                  className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
              ) : error && nowPlayingId === id ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              ) : (
                <SpeakerWaveIcon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ChatMessage);