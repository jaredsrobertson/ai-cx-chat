import { HiOutlineSpeakerWave, HiOutlineExclamationTriangle, HiCloud } from 'react-icons/hi2';
import ConfidentialDisplay from './ConfidentialDisplay';
import { useTTS } from '@/contexts/TTSContext';
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

// Internal component for the Bot's avatar
const Avatar = () => (
  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-brand-navy flex-shrink-0">
    <HiCloud className="w-5 h-5 text-white" />
  </div>
);

// Internal component for the Speak button
const SpeakButton = memo(function SpeakButton({ textToSpeak, messageId }) {
  const { play, stop, retryPlay, nowPlayingId, isLoading, error } = useTTS();
  const isThisMessagePlaying = nowPlayingId === messageId;

  const handleSpeakButtonClick = () => isThisMessagePlaying ? stop() : play(textToSpeak, messageId);
  const handleRetry = () => retryPlay(textToSpeak, messageId);

  return (
    <div className="flex items-center gap-1">
      {error && isThisMessagePlaying && <button onClick={handleRetry} className="text-xs text-red-500 hover:text-red-700 underline" title="Retry audio playback">Retry</button>}
      <button
        onClick={handleSpeakButtonClick}
        className={clsx('p-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue', {
          'text-blue-500 bg-blue-100': isThisMessagePlaying,
          'text-gray-400 cursor-wait': isLoading && isThisMessagePlaying,
          'text-red-500 bg-red-50': error && isThisMessagePlaying,
          'text-gray-400 hover:bg-gray-200 hover:text-brand-blue': !isThisMessagePlaying,
        })}
        aria-label={isThisMessagePlaying ? "Stop reading" : "Read aloud"}
        disabled={isLoading && isThisMessagePlaying}
      >
        {isLoading && isThisMessagePlaying ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
         : error && isThisMessagePlaying ? <HiOutlineExclamationTriangle className="w-4 h-4" />
         : <HiOutlineSpeakerWave className="w-4 h-4" />}
      </button>
    </div>
  );
});

// Internal component for rendering a Bot's message
const BotMessage = ({ id, content, timestamp }) => {
  const textContent = (typeof content === 'object' && content !== null) ? content.speakableText : content;
  
  return (
    <div className="flex items-start gap-2">
      <Avatar />
      <div className="flex flex-col items-start w-full">
        <div className="bot-bubble max-w-xs lg:max-w-md px-4 py-2 rounded-2xl bg-brand-ui-01 text-brand-text-primary dark:bg-dark-brand-ui-01 dark:text-dark-brand-text-primary border border-brand-ui-03 dark:border-dark-brand-ui-03 rounded-bl-md">
          <p className="text-sm whitespace-pre-wrap">{textContent}</p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs opacity-70">{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <SpeakButton textToSpeak={textContent} messageId={id} />
          </div>
        </div>
        {content?.confidentialData && (
          <div className="mt-1 w-full max-w-xs lg:max-w-md">
            <ConfidentialDisplay data={content.confidentialData} />
          </div>
        )}
      </div>
    </div>
  );
};

// Internal component for rendering a User's message
const UserMessage = ({ content, timestamp }) => (
  <div className="flex justify-end">
    <div className="user-bubble max-w-xs lg:max-w-md px-4 py-2 rounded-2xl bg-brand-blue text-white ml-auto rounded-br-md dark:bg-dark-brand-blue dark:text-brand-text-primary">
      <p className="text-sm whitespace-pre-wrap">{content}</p>
      <div className="text-right mt-1.5">
        <span className="text-xs opacity-70">{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  </div>
);

// Main ChatMessage component
const ChatMessage = ({ id, author, type, content, timestamp }) => {
  const isUser = author === 'user';

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  };

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className="my-2"
      role="group"
      aria-label={isUser ? 'User message' : 'Assistant message'}
    >
      {isUser
        ? <UserMessage content={content} timestamp={timestamp} />
        : <BotMessage id={id} content={content} timestamp={timestamp} />}
    </motion.div>
  );
};

export default memo(ChatMessage);