import { speakText } from '../../lib/tts';
import { SpeakerWaveIcon } from '@heroicons/react/24/solid';
import ConfidentialDisplay from './ConfidentialDisplay';

const Avatar = () => {
  return (
    <div className="avatar avatar-bot">
      <span className="text-xl">🤖</span>
    </div>
  );
};

export default function ChatMessage({ message }) {
  const isUser = message.sender === 'user';

  // User message bubble
  if (isUser) {
    return (
      <div className="flex justify-end my-2">
        <div className="chat-message user">
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
          <span className="text-xs opacity-70 mt-1 block text-right">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  // Bot message bubble
  return (
    <div className="flex items-start gap-2.5 my-2">
      <Avatar />
      <div className="chat-message bot">
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        
        {/* Conditionally render the secure box for confidential data */}
        {message.confidentialData && <ConfidentialDisplay data={message.confidentialData} />}
        
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs opacity-70">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button 
            onClick={() => speakText(message.text)}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-banking-blue transition-colors"
            aria-label="Read message aloud"
          >
            <SpeakerWaveIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}