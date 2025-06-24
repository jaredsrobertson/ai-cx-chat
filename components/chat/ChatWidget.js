import { useState, useEffect, useRef, useCallback } from 'react';
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
  ShieldCheckIcon,
  XMarkIcon
} from '../ui/Icons';

const ChatWidgetInner = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('banking');
  const [selectedBot, setSelectedBot] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const ctaShownRef = useRef(false);

  const { user, logout } = useAuth();
  const { stop, clearCache, error: ttsError, isAutoResponseEnabled, toggleAutoResponse } = useTTS();

  // --- CTA Logic ---
  const triggerCta = useCallback(() => {
    if (ctaShownRef.current || isOpen) return;
    ctaShownRef.current = true;
    setShowCta(true);
    setTimeout(() => setShowCta(false), 7000); // Show CTA for 7 seconds
  }, [isOpen]);

  // Timed CTA trigger
  useEffect(() => {
    const timer = setTimeout(triggerCta, 7000);
    return () => clearTimeout(timer);
  }, [triggerCta]);

  // Scroll-based CTA trigger
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        triggerCta();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [triggerCta]);
  // --- End CTA Logic ---

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
    stop();
    setTimeout(() => {
      setSelectedBot(null);
    }, 300);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setShowCta(false); // Hide CTA when widget is opened
  };
  
  const backToSelection = () => {
    setSelectedBot(null);
    stop();
  };

  const handleLoginRequired = () => {
    setShowLoginModal(true);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
  };

  const handleLoginClose = () => {
    setShowLoginModal(false);
  };

  return (
    <>
      {/* CTA Bubble */}
      {showCta && !isOpen && (
        <div className="fixed bottom-10 right-36 w-64 animate-cta-slide-in z-40">
          <div className="bg-white p-4 rounded-lg shadow-2xl border border-gray-100 relative">
            <p className="text-gray-800 font-medium text-center">Hey there! Let's chat!</p>
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white transform rotate-45"></div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-6 right-6 w-24 h-24 bg-banking-blue hover:bg-banking-navy text-white rounded-full shadow-2xl hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 relative overflow-hidden group ${!isOpen ? 'animate-shine' : ''}`}
        aria-label="Open chat assistant"
      >
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
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
            
            <div className="flex items-center space-x-1">
              {/* Conditional controls */}
              {selectedBot && (
                <>
                  <button onClick={backToSelection} className="p-2 rounded-full hover:bg-white/20 transition-colors" title="Back to bot selection">
                    <ArrowUturnLeftIcon className="w-5 h-5" />
                  </button>
                  <button onClick={toggleAutoResponse} className="p-2 rounded-full hover:bg-white/20 transition-colors" title={isAutoResponseEnabled ? "Disable Auto-Speak" : "Enable Auto-Speak"}>
                    {isAutoResponseEnabled ? <SpeakerWaveIcon className="w-5 h-5" /> : <SpeakerXMarkIcon className="w-5 h-5" />}
                  </button>
                  {user && (
                    <button onClick={logout} className="p-2 rounded-full hover:bg-white/20 transition-colors" title="Logout">
                      <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
              {/* Close button is always available */}
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/20 transition-colors" title="Close Chat">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          {/* TTS Error Banner */}
          {ttsError && (
            <div className="bg-yellow-50 border-b border-yellow-200 p-2">
              <p className="text-yellow-800 text-xs">Audio: {ttsError}</p>
            </div>
          )}
          
          {/* Main Content */}
          <div className="flex-grow overflow-hidden bg-white">
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