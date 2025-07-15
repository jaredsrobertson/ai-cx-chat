import { useReducer, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ChatTabs from './ChatTabs';
import ErrorBoundary from '../ErrorBoundary';
import BotSelection from './BotSelection';
import Handoff from './Handoff'; // Import the new Handoff component
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
  HiOutlineChatBubbleOvalLeftEllipsis,
} from 'react-icons/hi2';
import { logger } from '@/lib/logger';

const LoginModal = dynamic(() => import('../auth/LoginModal'));

const initialState = {
  isOpen: false,
  activeTab: 'banking',
  selectedBot: null,
  showLoginModal: false,
  isHandoff: false, // New state for managing handoff mode
};

function widgetReducer(state, action) {
  switch (action.type) {
    case 'OPEN':
      return { ...state, isOpen: true };
    case 'CLOSE':
      // Reset the entire state, including handoff, on close
      return { ...initialState };
    case 'SELECT_BOT':
      return { ...state, selectedBot: action.payload, activeTab: action.payload };
    case 'BACK_TO_SELECTION':
      return { ...state, selectedBot: null };
    case 'SHOW_LOGIN_MODAL':
      return { ...state, showLoginModal: true };
    case 'HIDE_LOGIN_MODAL':
      return { ...state, showLoginModal: false };
    case 'START_HANDOFF':
      return { ...state, isHandoff: true };
    case 'END_HANDOFF':
      return { ...state, isHandoff: false };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

const ChatWidgetInner = () => {
  const [state, dispatch] = useReducer(widgetReducer, initialState);
  const { isOpen, activeTab, selectedBot, showLoginModal, isHandoff } = state;

  const notificationAudioRef = useRef(null);
  const handoffMessageHistory = useRef([]); // Store history for the handoff summary

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
  
  const handleAgentRequest = useCallback((history = []) => {
    logger.debug('Agent handoff requested');
    handoffMessageHistory.current = history; // Store the history for the summary
    dispatch({ type: 'START_HANDOFF' });
  }, []);

  const handleCancelHandoff = useCallback(() => {
    logger.debug('Agent handoff cancelled');
    dispatch({ type: 'END_HANDOFF' });
  }, []);


  useEffect(() => {
    const handleToggle = (event) => {
      if (event.target.closest('[data-chat-toggle]')) {
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
              {selectedBot && !isHandoff && (
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
          <div className="flex-grow overflow-hidden bg-brand-ui-02">
            <ErrorBoundary>
              {isHandoff ? (
                <Handoff messageHistory={handoffMessageHistory.current} onCancel={handleCancelHandoff} />
              ) : !selectedBot ? (
                <BotSelection onSelect={handleBotSelection} onAgentRequest={handleAgentRequest} />
              ) : (
                <ChatTabs
                  activeTab={activeTab}
                  setActiveTab={(tab) => dispatch({ type: 'SELECT_BOT', payload: tab })}
                  onLoginRequired={handleLoginRequired}
                  notificationAudioRef={notificationAudioRef}
                  onAgentRequest={handleAgentRequest}
                />
              )}
            </ErrorBoundary>
          </div>
        </div>
      </div>
      
      <button
        onClick={handleOpen}
        className="chat-fab bg-brand-blue hover:bg-brand-navy text-white rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300"
        aria-label="Open Chat"
      >
        <HiOutlineChatBubbleOvalLeftEllipsis className="w-8 h-8" />
      </button>

      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => dispatch({ type: 'HIDE_LOGIN_MODAL' })}
          onSuccess={handleLoginSuccess}
        />
      )}
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