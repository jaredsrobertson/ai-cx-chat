import { speakText } from '../../lib/tts';

// A simple avatar component to avoid cluttering the main component
const Avatar = ({ sender }) => {
  const isUser = sender === 'user';
  // User initials or a bot icon
  const content = isUser ? 'U' : 'B'; 
  const avatarClass = isUser ? 'avatar-user' : 'avatar-bot';

  return (
    <div className={`avatar ${avatarClass}`}>
      <span className="text-sm font-semibold">{content}</span>
    </div>
  );
};

export default function ChatMessage({ message }) {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex items-end gap-3 my-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Bot Avatar */}
      {!isUser && <Avatar sender="bot" />}

      {/* Message Bubble */}
      <div className={`chat-message ${message.sender}`}>
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        <span className="text-xs opacity-70 mt-1 block">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* User Avatar */}
      {isUser && <Avatar sender="user" />}

      {/* TTS Button for Bot Messages */}
      {!isUser && (
        <button 
          onClick={() => speakText(message.text)}
          className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-banking-blue transition-colors self-center"
          aria-label="Read message aloud"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.25 3.75a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V4.5a.75.75 0 01.75-.75zM12.25 5.25a.75.75 0 01.75.75v7.5a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75zM4.25 6.75a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0V7.5a.75.75 0 01.75-.75zM16.25 6.75a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0V7.5a.75.75 0 01.75-.75z"></path>
          </svg>
        </button>
      )}
    </div>
  );
}