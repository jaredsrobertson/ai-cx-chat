import { useState, useEffect } from 'react';
import ChatTabs from './ChatTabs';
import LoginModal from '../auth/LoginModal';
import ErrorBoundary from '../ErrorBoundary';
import BotSelection from './BotSelection';
import { useAuth } from '../../hooks/useAuth';
import { TTSProvider, useTTS } from '../../contexts/TTSContext';
import { 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon, 
  ArrowUturnLeftIcon, 
  ArrowLeftOnRectangleIcon, 
  ShieldCheckIcon 
} from '../ui/Icons';

const ChatWidgetInner = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('banking');
  const [selectedBot, setSelectedBot] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const { user, logout } = useAuth();
  const { stop, clearCache, error: ttsError, isAutoResponseEnabled, toggleAutoResponse } = useTTS();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCache();
    };
  }, [clearCache]);

  const handleBotSelection = (bot) => {
    setSelectedBot(bot);
    setActiveTab(bot);
  };

  const handleClose = () => {
    setIsOpen(false);
    stop(); // Stop any playing audio when closing
    setTimeout(() => {
      setSelectedBot(null);
    }, 300);
  };

  const handleOpen = () => setIsOpen(true);
  
  const backToSelection = () => {
    setSelectedBot(null);
    stop(); // Stop audio when going back
  };

  // Handle login requirement from chat
  const handleLoginRequired = () => {
    console.log('🔐 Login required, showing modal');
    setShowLoginModal(true);
  };

  // Handle successful login
  const handleLoginSuccess = () => {
    console.log('✅ Login successful, closing modal');
    setShowLoginModal(false);
  };

  // Handle login modal close
  const handleLoginClose = () => {
    console.log('❌ Login modal closed');
    setShowLoginModal(false);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        data-chat-toggle="true"
        onClick={isOpen ? handleClose : handleOpen}
        className={`fixed bottom-6 right-6 w-16 h-16 bg-banking-blue hover:bg-banking-navy text-white rounded-full shadow-2xl hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 ${!isOpen ? 'animate-glow-bounce' : ''}`}
        aria-label={isOpen ? 'Close chat assistant' : 'Open chat assistant'}
      >
        {isOpen ? (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>
      
      {/* Chat Widget Container */}
      <div className={`chat-widget-container ${isOpen ? 'open' : 'closed'}`}>
        <div className="chat-widget-inner">
          {/* Header */}
          <div className="bg-banking-blue text-white p-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="w-6 h-6" />
              <h3 className="font-semibold text-lg">CloudBank</h3>
            </div>
            
            {/* Header Controls */}
            <div className="flex items-center space-x-1">
              {selectedBot && (
                <button 
                  onClick={backToSelection} 
                  className="p-2 rounded-full hover:bg-white/20 transition-colors" 
                  title="Back to bot selection"
                  aria-label="Back to bot selection"
                >
                  <ArrowUturnLeftIcon className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={toggleAutoResponse} 
                className="p-2 rounded-full hover:bg-white/20 transition-colors" 
                title={isAutoResponseEnabled ? "Disable Auto-Speak" : "Enable Auto-Speak"}
                aria-label={isAutoResponseEnabled ? "Disable Auto-Speak" : "Enable Auto-Speak"}
              >
                {isAutoResponseEnabled ? 
                  <SpeakerWaveIcon className="w-5 h-5" /> : 
                  <SpeakerXMarkIcon className="w-5 h-5" />
                }
              </button>
              {user && (
                <button 
                  onClick={logout} 
                  className="p-2 rounded-full hover:bg-white/20 transition-colors" 
                  title="Logout"
                  aria-label="Logout"
                >
                  <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* TTS Error Banner */}
          {ttsError && (
            <div className="bg-yellow-50 border-b border-yellow-200 p-2">
              <p className="text-yellow-800 text-xs">
                Audio: {ttsError}
              </p>
            </div>
          )}
          
          {/* Debug Info (remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 border-b border-gray-200 p-2 text-xs">
              <div className="flex items-center justify-between">
                <span>Auth: {user ? user.name : 'Not logged in'}</span>
                <span>Modal: {showLoginModal ? 'Open' : 'Closed'}</span>
              </div>
            </div>
          )}
          
          {/* Main Content */}
          <div className="flex-grow overflow-hidden bg-gray-50">
            <ErrorBoundary>
              {!selectedBot ? (
                <BotSelection onSelect={handleBotSelection} />
              ) : (
                <ChatTabs 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onLoginRequired={handleLoginRequired}
                />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </div>
      
      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={handleLoginClose} 
        onSuccess={handleLoginSuccess} 
      />
    </>
  );
};

export default function ChatWidget() {
  return (
    <TTSProvider>
      <ErrorBoundary>
        <ChatWidgetInner />
      </ErrorBoundary>
    </TTSProvider>
  );
}