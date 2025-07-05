import { useReducer, useEffect, useRef, useCallback } from 'react';
import ChatTabs from './ChatTabs';
import LoginModal from '../auth/LoginModal';
import ErrorBoundary from '../ErrorBoundary';
import BotSelection from './BotSelection';
import { useAuth } from '@/hooks/useAuth';
import { TTSProvider, useTTS } from '@/contexts/TTSContext';
import {
  HiOutlineSpeakerWave,
  HiOutlineSpeakerXMark,
  HiOutlineArrowUturnLeft,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineShieldCheck,
  HiOutlineXMark,
  HiOutlineBell,
  HiOutlineBellSlash,
  HiOutlineChatBubbleOvalLeftEllipsis
} from 'react-icons/hi2';
import { logger } from '@/lib/utils';

const initialState = {
  isOpen: false,
  activeTab: 'banking',
  selectedBot: null,
  showLoginModal: false,
};

function widgetReducer(state, action) {
  switch (action.type) {
    case 'OPEN':
      return { ...state, isOpen: true };
    case 'CLOSE':
      return { ...initialState }; // Reset state on close
    case 'SELECT_BOT':
      return { ...state, selectedBot: action.payload, activeTab: action.payload };
    case 'BACK_TO_SELECTION':
        return { ...state, selectedBot: null };
    case 'SHOW_LOGIN_MODAL':
      return { ...state, showLoginModal: true };
    case 'HIDE_LOGIN_MODAL':
      return { ...state, showLoginModal: false };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}


const ChatWidgetInner = () => {
  const [state, dispatch] = useReducer(widgetReducer, initialState);
  const { isOpen, activeTab, selectedBot, showLoginModal } = state;

  const notificationAudioRef = useRef(null);

  const { user, logout } = useAuth();
  const { stop, error: ttsError, isAutoResponseEnabled, toggleAutoResponse, isNotificationEnabled, toggleNotificationSound } = useTTS();

  const handleOpen = useCallback(() => {
    logger.debug('Chat widget opening');
    dispatch({ type: 'OPEN' });
  }, []);

  const handleClose = useCallback(() => {
    logger.debug('Chat widget closing');
    stop();
    dispatch({ type: 'CLOSE' });
  }, [stop]);

  const handleBotSelection = useCallback((bot) => {
    logger.debug(`Bot selected: ${bot}`);
    dispatch({ type: 'SELECT_BOT', payload: bot });
  }, []);

  const backToSelection = useCallback(() => {
    stop();
    dispatch({ type: 'BACK_TO_SELECTION' });
  }, [stop]);

  const handleLoginRequired = useCallback(() => {
    dispatch({ type: 'SHOW_LOGIN_MODAL' });
  }, []);

  const handleLoginSuccess = useCallback(() => {
    dispatch({ type: 'HIDE_LOGIN_MODAL' });
  }, []);

  useEffect(() => {
    const handleToggle = (event) => {
        if(event.target.closest('[data-chat-toggle]')) {
            handleOpen();
        }
    };

    document.addEventListener('click', handleToggle);
    return () => document.removeEventListener('click', handleToggle);
  }, [handleOpen]);


  return (
    <>
      <audio ref={notificationAudioRef} src="/notify.mp3" preload="auto" />

      <div className={`chat-widget-container ${isOpen ? 'open' : 'closed'}`}>
        <div className="chat-widget-inner">
          <div className="bg-brand-blue text-white p-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2">
              <HiOutlineShieldCheck className="w-6 h-6" />
              <h3 className="font-semibold text-lg">CloudBank</h3>
            </div>
            <div className="flex items-center space-x-1">
              {selectedBot && (
                <>
                  <button onClick={backToSelection} className="p-2 rounded-full hover:bg-white/20" title="Back"><HiOutlineArrowUturnLeft className="w-5 h-5" /></button>
                  <button onClick={toggleNotificationSound} className="p-2 rounded-full hover:bg-white/20" title="Toggle Notifications">{isNotificationEnabled ? <HiOutlineBell className="w-5 h-5" /> : <HiOutlineBellSlash className="w-5 h-5" />}</button>
                  <button onClick={toggleAutoResponse} className="p-2 rounded-full hover:bg-white/20" title="Toggle Auto-Speak">{isAutoResponseEnabled ? <HiOutlineSpeakerWave className="w-5 h-5" /> : <HiOutlineSpeakerXMark className="w-5 h-5" />}</button>
                  {user && <button onClick={logout} className="p-2 rounded-full hover:bg-white/20" title="Logout"><HiOutlineArrowLeftOnRectangle className="w-5 h-5" /></button>}
                </>
              )}
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/20" title="Close"><HiOutlineXMark className="w-6 h-6" /></button>
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
                  setActiveTab={(tab) => dispatch({ type: 'SELECT_BOT', payload: tab })}
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
        <HiOutlineChatBubbleOvalLeftEllipsis className="w-12 h-12" />
      </button>

      <LoginModal isOpen={showLoginModal} onClose={() => dispatch({ type: 'HIDE_LOGIN_MODAL' })} onSuccess={handleLoginSuccess} />
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