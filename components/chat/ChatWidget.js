import { useReducer, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ConversationView from './ConversationView';
import ErrorBoundary from '../ErrorBoundary';
import BotSelection from './BotSelection';
import Handoff from './Handoff';
import AnalyticsDisplay from '../analytics/AnalyticsDisplay';
import { useAuth } from '@/hooks/useAuth';
import { TTSProvider, useTTS } from '@/contexts/TTSContext';
import { motion, AnimatePresence } from 'framer-motion';
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
  view: 'closed', // 'closed', 'selecting', 'chatting', 'handoff'
  selectedBot: null,
  showLoginModal: false,
};

function widgetReducer(state, action) {
  switch (action.type) {
    case 'OPEN':
      return { ...state, view: 'selecting' };
    case 'CLOSE':
      return { ...initialState };
    case 'SELECT_BOT':
      return { ...state, view: 'chatting', selectedBot: action.payload };
    case 'BACK_TO_SELECTION':
      return { ...state, view: 'selecting', selectedBot: null };
    case 'SHOW_LOGIN_MODAL':
      return { ...state, showLoginModal: true };
    case 'HIDE_LOGIN_MODAL':
      return { ...state, showLoginModal: false };
    case 'START_HANDOFF':
      return { ...state, view: 'handoff' };
    case 'END_HANDOFF':
      // Return to the bot selection screen after handoff is cancelled
      return { ...state, view: 'selecting', selectedBot: null };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

const ChatWidgetInner = () => {
  const [state, dispatch] = useReducer(widgetReducer, initialState);
  const { view, selectedBot, showLoginModal } = state;
  const isOpen = view !== 'closed';

  const notificationAudioRef = useRef(null);
  const handoffMessageHistory = useRef([]);
  const chatHookRef = useRef(null); 

  const { user, logout } = useAuth();
  const { stop, isAutoResponseEnabled, toggleAutoResponse, isNotificationEnabled, toggleNotificationSound } = useTTS();

  const handleOpen = useCallback(() => dispatch({ type: 'OPEN' }), []);
  const handleClose = useCallback(() => {
    stop();
    dispatch({ type: 'CLOSE' });
  }, [stop]);

  const handleBotSelection = useCallback((bot) => dispatch({ type: 'SELECT_BOT', payload: bot }), []);
  const backToSelection = useCallback(() => {
    stop();
    dispatch({ type: 'BACK_TO_SELECTION' });
  }, [stop]);
  
  const handleLoginRequired = useCallback(() => dispatch({ type: 'SHOW_LOGIN_MODAL' }), []);
  const handleLoginSuccess = useCallback(() => {
    dispatch({ type: 'HIDE_LOGIN_MODAL' });
    setTimeout(() => chatHookRef.current?.retryLastMessage?.(), 100);
  }, []);
  
  const handleAgentRequest = useCallback((history = []) => {
    handoffMessageHistory.current = history;
    dispatch({ type: 'START_HANDOFF' });
  }, []);

  const handleCancelHandoff = useCallback(() => dispatch({ type: 'END_HANDOFF' }), []);

  const renderContent = () => {
    switch (view) {
      case 'selecting':
        return <BotSelection onSelect={handleBotSelection} onAgentRequest={handleAgentRequest} />;
      case 'chatting':
        return <ConversationView activeBot={selectedBot} onLoginRequired={handleLoginRequired} notificationAudioRef={notificationAudioRef} onAgentRequest={handleAgentRequest} ref={chatHookRef} />;
      case 'handoff':
        return <Handoff messageHistory={handoffMessageHistory.current} onCancel={handleCancelHandoff} />;
      default:
        return null;
    }
  };

  return (
    <>
      <audio ref={notificationAudioRef} src="/notify.mp3" preload="auto" />
      <AnimatePresence>
        {isOpen && (
          <motion.div /* ...animation props... */ className="chat-widget-container">
            <div className="chat-widget-inner">
              {/* Header */}
              <div className="bg-brand-blue dark:bg-dark-brand-ui-01 text-white p-3 flex items-center justify-between">
                {/* ...header content... */}
              </div>

              {view === 'chatting' && <AnalyticsDisplay />}
              
              <div className="flex-grow overflow-hidden bg-brand-ui-02 dark:bg-dark-brand-ui-02">
                <ErrorBoundary>{renderContent()}</ErrorBoundary>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isOpen && (
          <motion.button /* ...animation props... */ onClick={handleOpen} className="chat-fab ...">
              <HiOutlineChatBubbleOvalLeftEllipsis className="w-8 h-8" />
          </motion.button>
      )}

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