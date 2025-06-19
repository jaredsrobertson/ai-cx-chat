import { useState, forwardRef } from 'react';
import dynamic from 'next/dynamic';
import ChatTabs from './ChatTabs';
import LoginModal from '../auth/LoginModal';
import { useAuth } from '../../hooks/useAuth';
import BotSelection from './BotSelection';
import { SpeakerWaveIcon, SpeakerXMarkIcon, ArrowUturnLeftIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

const BackIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => mod.ArrowUturnLeftIcon), { ssr: false });
const LogoutIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => mod.ArrowLeftOnRectangleIcon), { ssr: false });
const TTSOnIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => mod.SpeakerWaveIcon), { ssr: false });
const TTSOffIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => mod.SpeakerXMarkIcon), { ssr: false });


const ChatWidget = forwardRef((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('banking');
  const [selectedBot, setSelectedBot] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false); // State is now managed here
  const { user, logout } = useAuth();

  const handleBotSelection = (bot) => {
    setSelectedBot(bot);
    setActiveTab(bot);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setSelectedBot(null);
    }, 300);
  };
  
  const handleOpen = () => {
    setIsOpen(true);
  };

  const backToSelection = () => {
    setSelectedBot(null);
  };

  return (
    <>
      <button
        data-chat-toggle="true"
        onClick={isOpen ? handleClose : handleOpen}
        className={`fixed bottom-6 right-6 w-16 h-16 bg-banking-blue hover:bg-banking-navy text-white rounded-full shadow-2xl hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 ${!isOpen ? 'animate-glow-bounce' : ''}`}
      >
        {isOpen ? <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> : <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
      </button>
      <div className={`chat-widget-container ${isOpen ? 'open' : 'closed'}`}>
        <div className="chat-widget-inner">
            <div className="bg-banking-blue text-white p-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-lg">SecureBank Assistant</h3>
                </div>
                <div className="flex items-center space-x-1">
                    {selectedBot && (
                        <button onClick={backToSelection} className="p-2 rounded-full hover:bg-white/20" title="Back to selection"><BackIcon className="w-5 h-5" /></button>
                    )}
                    <button onClick={() => setIsTtsEnabled(!isTtsEnabled)} className="p-2 rounded-full hover:bg-white/20" title={isTtsEnabled ? "Disable Auto-Speak" : "Enable Auto-Speak"}>
                        {isTtsEnabled ? <TTSOnIcon className="w-5 h-5" /> : <TTSOffIcon className="w-5 h-5" />}
                    </button>
                    {user && (
                        <button onClick={logout} className="p-2 rounded-full hover:bg-white/20" title="Logout"><LogoutIcon className="w-5 h-5" /></button>
                    )}
                </div>
            </div>
            <div className="flex-grow overflow-hidden bg-gray-50">
                {!selectedBot ? (
                    <BotSelection onSelect={handleBotSelection} />
                ) : (
                    <ChatTabs 
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        isTtsEnabled={isTtsEnabled} // Pass state down
                        onLoginRequired={() => setShowLoginModal(true)}
                    />
                )}
            </div>
        </div>
      </div>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onSuccess={() => setShowLoginModal(false)} />
    </>
  );
});

ChatWidget.displayName = 'ChatWidget';
export default ChatWidget;