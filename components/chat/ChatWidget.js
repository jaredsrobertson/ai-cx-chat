import { useReducer, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import ConversationView from './ConversationView';
import ErrorBoundary from '../ErrorBoundary';
import BotSelection from './BotSelection';
import Handoff from './Handoff';
import AnalyticsDisplay from '../analytics/AnalyticsDisplay';
import { useAppStore } from '@/store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineArrowUturnLeft,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineShieldCheck,
  HiOutlineXMark,
  HiOutlineChatBubbleOvalLeftEllipsis,
} from 'react-icons/hi2';

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

  const { user, logout, retryLastMessage } = useAppStore(state => ({
    user: state.user,
    logout: state.logout,
    retryLastMessage: state.retryLastMessage,
  }));

  const handleOpen = useCallback(() => dispatch({ type: 'OPEN' }), []);
  const handleClose = useCallback(() => dispatch({ type: 'CLOSE' }), []);

  const handleBotSelection = useCallback((bot) => dispatch({ type: 'SELECT_BOT', payload: bot }), []);
  const backToSelection = useCallback(() => dispatch({ type: 'BACK_TO_SELECTION' }), []);
  
  const handleLoginRequired = useCallback(() => dispatch({ type: 'SHOW_LOGIN_MODAL' }), []);
  const handleLoginSuccess = useCallback(() => {
    dispatch({ type: 'HIDE_LOGIN_MODAL' });
    setTimeout(() => retryLastMessage(), 100);
  }, [retryLastMessage]);
  
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
        return <ConversationView activeBot={selectedBot} onLoginRequired={handleLoginRequired} notificationAudioRef={notificationAudioRef} onAgentRequest={handleAgentRequest} />;
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="chat-widget-container"
          >
            <div className="chat-widget-inner">
              <div className="bg-brand-blue dark:bg-dark-brand-ui-01 text-white p-3 flex items-center justify-between">
                <div>
                    {view === 'chatting' && (
                        <button onClick={backToSelection} className="text-white hover:bg-white/20 p-2 rounded-full"><HiOutlineArrowUturnLeft /></button>
                    )}
                </div>
                <div className="text-center">
                    <h3 className="font-bold">{user ? `Welcome, ${user.name}` : 'CloudBank Assistant'}</h3>
                </div>
                <div>
                    {user && <button onClick={logout} className="text-white hover:bg-white/20 p-2 rounded-full"><HiOutlineArrowLeftOnRectangle /></button>}
                    <button onClick={handleClose} className="text-white hover:bg-white/20 p-2 rounded-full"><HiOutlineXMark /></button>
                </div>
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
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleOpen}
            className="chat-fab bg-brand-blue text-white rounded-full shadow-lg flex items-center justify-center"
          >
              <HiOutlineChatBubbleOvalLeftEllipsis className="w-8 h-8" />
          </motion.button>
      )}

      <LoginModal isOpen={showLoginModal} onClose={() => dispatch({ type: 'HIDE_LOGIN_MODAL' })} onSuccess={handleLoginSuccess} />
    </>
  );
};

export default function ChatWidget() {
  return (
    <ErrorBoundary>
      <ChatWidgetInner />
    </ErrorBoundary>
  );
}