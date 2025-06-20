import { SpeakerWaveIcon } from '@heroicons/react/24/solid';
import ConfidentialDisplay from './ConfidentialDisplay';
import { useTTS } from '../../contexts/TTSContext'; // Updated import path

const Avatar = () => (
  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-banking-navy flex-shrink-0">
    <span className="text-xl">🤖</span>
  </div>
);

export default function ChatMessage({ id, author, type, content, timestamp }) {
  const { play, stop, nowPlayingId } = useTTS();
  const isUser = author === 'user';
  const isThisMessagePlaying = nowPlayingId === id;

  const textToSpeak = content.speakableText || content;

  // Handles all play/stop scenarios for this specific message
  const handleSpeakButtonClick = () => {
    if (isThisMessagePlaying) {
      stop();
    } else {
      play(textToSpeak, id);
    }
  };

  // Handling for user messages
  if (isUser) {
    return (
      <div className="flex justify-end my-2">
        <div className="chat-message user">
          <p className="text-sm whitespace-pre-wrap">{content}</p>
          <span className="text-xs opacity-70 mt-1 block text-right">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  // Handling for bot messages, with original structure restored
  return (
    <div className="flex items-start gap-2.5 my-2">
      <Avatar />
      <div className="chat-message bot">
        <p className="text-sm whitespace-pre-wrap">{textToSpeak}</p>
        {type === 'structured' && content.confidentialData && <ConfidentialDisplay data={content.confidentialData} />}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs opacity-70">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button 
            onClick={handleSpeakButtonClick}
            className={`p-1 rounded-full transition-colors ${
              isThisMessagePlaying 
                ? 'text-blue-500 bg-blue-100' // Blue when playing
                : 'text-gray-400 hover:bg-gray-200 hover:text-banking-blue' // Grey otherwise
            }`}
            aria-label="Read message aloud"
          >
            <SpeakerWaveIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}