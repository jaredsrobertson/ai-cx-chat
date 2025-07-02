import { useState, useEffect, useRef, useCallback } from 'react';
import ChatTabs from './ChatTabs';
import LoginModal from '../auth/LoginModal';
import ErrorBoundary from '../ErrorBoundary';
import BotSelection from './BotSelection';
import { useAuth } from '@/hooks/useAuth';
import { TTSProvider, useTTS } from '@/contexts/TTSContext';
import { 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon, 
  ArrowUturnLeftIcon, 
  ArrowLeftOnRectangleIcon, 
  ShieldCheckIcon,
  XMarkIcon,
  BellIcon,
  BellSlashIcon
} from '@/components/ui/Icons';
import { logger } from '@/lib/utils';

const ChatWidgetInner = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('banking');
  const [selectedBot, setSelectedBot] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const notificationAudioRef = useRef(null);

  const { user, logout } = useAuth();
  const { stop, error: ttsError, isAutoResponseEnabled, toggleAutoResponse, isNotificationEnabled, toggleNotificationSound } = useTTS();

  const handleOpen = useCallback(() => {
    logger.debug('Chat widget opening');
    setIsOpen(true);
  }, []);

  const handleBotSelection = (bot) => {
    logger.debug(`Bot selected: ${bot}`);
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
  
  const backToSelection = () => {
    setSelectedBot(null);
    stop();
  };

  const handleLoginRequired = () => {
    setShowLoginModal(true);
  };

  return (
    <>
      <audio ref={notificationAudioRef} src="/notify.mp3" preload="auto" />

      <div className={`chat-widget-container ${isOpen ? 'open' : 'closed'}`}>
        <div className="chat-widget-inner">
          <div className="bg-brand-blue text-white p-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="w-6 h-6" />
              <h3 className="font-semibold text-lg">CloudBank</h3>
            </div>
            <div className="flex items-center space-x-1">
              {selectedBot && (
                <>
                  <button onClick={backToSelection} className="p-2 rounded-full hover:bg-white/20" title="Back"><ArrowUturnLeftIcon className="w-5 h-5" /></button>
                  <button onClick={toggleNotificationSound} className="p-2 rounded-full hover:bg-white/20" title="Toggle Notifications">{isNotificationEnabled ? <BellIcon className="w-5 h-5" /> : <BellSlashIcon className="w-5 h-5" />}</button>
                  <button onClick={toggleAutoResponse} className="p-2 rounded-full hover:bg-white/20" title="Toggle Auto-Speak">{isAutoResponseEnabled ? <SpeakerWaveIcon className="w-5 h-5" /> : <SpeakerXMarkIcon className="w-5 h-5" />}</button>
                  {user && <button onClick={logout} className="p-2 rounded-full hover:bg-white/20" title="Logout"><ArrowLeftOnRectangleIcon className="w-5 h-5" /></button>}
                </>
              )}
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/20" title="Close"><XMarkIcon className="w-6 h-6" /></button>
            </div>
          </div>
          {ttsError && (
            <div className="bg-yellow-100 border-b border-yellow-200 p-2">
              <p className="text-yellow-800 text-xs text-center">Audio playback error. Please try again.</p>
            </div>
          )}
          <div className="flex-grow overflow-hidden bg-gray-100">
            <ErrorBoundary>
              {!selectedBot ? (
                <BotSelection onSelect={handleBotSelection} />
              ) : (
                <ChatTabs 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onLoginRequired={handleLoginRequired}
                  notificationAudioRef={notificationAudioRef}
                />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </div>
      
      <button 
        onClick={handleOpen} 
        className="chat-fab w-24 h-24 text-brand-blue rounded-full flex items-center justify-center group animate-bounce-shine"
        aria-label="Open Chat"
      >
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
      </button>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onSuccess={() => setShowLoginModal(false)} />
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