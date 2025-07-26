import { HiOutlineSpeakerWave, HiOutlineExclamationTriangle, HiCloud } from 'react-icons/hi2';
import ConfidentialDisplay from './ConfidentialDisplay';
import { useTTS } from '@/contexts/TTSContext';
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const Avatar = () => (
  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-brand-navy flex-shrink-0">
    <HiCloud className="w-5 h-5 text-white" />
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
        className={clsx(
          'p-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-opacity-50',
          {
            'text-blue-500 bg-blue-100': isThisMessagePlaying,
            'text-gray-400 cursor-wait': isLoading && nowPlayingId === messageId,
            'text-red-500 bg-red-50': error && nowPlayingId === messageId,
            'text-gray-400 hover:bg-gray-200 hover:text-brand-blue':
              !isThisMessagePlaying && !(isLoading && nowPlayingId === messageId) && !(error && nowPlayingId === messageId),
          }
        )}
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

const messageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function ChatMessage({ id, author, type, content, timestamp }) {
  const isUser = author === 'user';

  const getSafeContent = (rawContent) => {
    if (typeof rawContent === 'object' && rawContent !== null && !Array.isArray(rawContent)) {
      return rawContent.speakableText || 'No speakable text available';
    }
    return rawContent || '';
  };

  const textContent = getSafeContent(content);

  // 🚨 DEBUG: Log the content structure for bot messages
  if (!isUser) {
    console.log('🔍 Bot Message Debug:', {
      id,
      type,
      content,
      hasConfidentialData: !!(typeof content === 'object' && content?.confidentialData),
      confidentialDataType: content?.confidentialData?.type
    });
  }

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={clsx('flex items-start gap-2 my-2', { 'justify-end': isUser })}
      role="group"
      aria-label={isUser ? 'User message' : 'Assistant message'}
    >
      {!isUser && <Avatar />}
      <div className={clsx('flex flex-col w-full', { 'items-end': isUser, 'items-start': !isUser })}>
        <div className={clsx('max-w-xs lg:max-w-md px-4 py-2 rounded-2xl', {
          'user bg-brand-blue text-white ml-auto rounded-br-md dark:bg-dark-brand-blue dark:text-brand-text-primary': isUser,
          'bot bg-brand-ui-01 text-brand-text-primary dark:bg-dark-brand-ui-01 dark:text-dark-brand-text-primary mr-auto border border-brand-ui-03 dark:border-dark-brand-ui-03 rounded-bl-md': !isUser,
        })}>
          <p className="text-sm whitespace-pre-wrap">{textContent}</p>
          
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs opacity-70">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {!isUser && <SpeakButton textToSpeak={textContent} messageId={id} />}
          </div>
        </div>

        {/* 🚨 DEBUG: Always show confidential data section with debug info */}
        {type === 'structured' && (
          <div className="mt-1 w-full max-w-xs lg:max-w-md">
            {content.confidentialData ? (
              <ConfidentialDisplay data={content.confidentialData} />
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-yellow-800">
                DEBUG: No confidentialData found in structured message
                <br />
                Content keys: {typeof content === 'object' ? Object.keys(content).join(', ') : 'N/A'}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(ChatMessage);