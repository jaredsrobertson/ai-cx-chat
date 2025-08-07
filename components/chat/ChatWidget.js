import { useReducer, useCallback, useRef, useEffect } from 'react';
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

  const user = useAppStore(state => state.user);
  const logout = useAppStore(state => state.logout);
  const retryLastMessage = useAppStore(state => state.retryLastMessage);
  const pendingMessage = useAppStore(state => state.pendingMessage);
  const messages = useAppStore(state => state.messages);
  
  // Handle pending message that requires authentication
  useEffect(() => {
    if (pendingMessage) {
      dispatch({ type: 'SHOW_LOGIN_MODAL' });
    }
  }, [pendingMessage]);

  const handleOpen = useCallback(() => dispatch({ type: 'OPEN' }), []);
  const handleClose = useCallback(() => dispatch({ type: 'CLOSE' }), []);

  const handleBotSelection = useCallback((bot) => dispatch({ type: 'SELECT_BOT', payload: bot }), []);
  const backToSelection = useCallback(() => dispatch({ type: 'BACK_TO_SELECTION' }), []);
  
  // Handle login modal trigger
  const handleLoginRequired = useCallback(() => {
    dispatch({ type: 'SHOW_LOGIN_MODAL' });
  }, []);
  
  const handleLoginSuccess = useCallback(() => {
    dispatch({ type: 'HIDE_LOGIN_MODAL' });
    // Retry the pending message after successful login
    setTimeout(() => retryLastMessage(), 100);
  }, [retryLastMessage]);
  
  const handleAgentRequest = useCallback((history = []) => {
    handoffMessageHistory.current = history || messages[selectedBot] || [];
    dispatch({ type: 'START_HANDOFF' });
  }, [messages, selectedBot]);

  const handleCancelHandoff = useCallback(() => dispatch({ type: 'END_HANDOFF' }), []);

  const renderContent = () => {
    switch (view) {
      case 'selecting':
        return (
          <BotSelection 
            onSelect={handleBotSelection} 
            onAgentRequest={() => handleAgentRequest([])} 
          />
        );
      case 'chatting':
        return (
          <ConversationView 
            activeBot={selectedBot} 
            notificationAudioRef={notificationAudioRef} 
            onAgentRequest={handleAgentRequest} 
          />
        );
      case 'handoff':
        return (
          <Handoff 
            messageHistory={handoffMessageHistory.current} 
            onCancel={handleCancelHandoff} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Hidden buttons for programmatic triggers */}
      <button 
        data-login-trigger 
        onClick={handleLoginRequired}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      
      <button 
        data-handoff-trigger 
        onClick={() => handleAgentRequest()}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {/* Notification audio */}
      <audio ref={notificationAudioRef} src="/notify.mp3" preload="auto" />
      
      {/* Main chat widget */}
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
              {/* Header */}
              <div className="bg-brand-blue dark:bg-dark-brand-ui-01 text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {view === 'chatting' && (
                    <button 
                      onClick={backToSelection} 
                      className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                      title="Back to bot selection"
                      aria-label="Back to bot selection"
                    >
                      <HiOutlineArrowUturnLeft className="w-4 h-4" />
                    </button>
                  )}
                  {view === 'handoff' && (
                    <button 
                      onClick={handleCancelHandoff} 
                      className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                      title="Cancel handoff"
                      aria-label="Cancel handoff"
                    >
                      <HiOutlineArrowUturnLeft className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="text-center flex-grow">
                  <h3 className="font-bold text-sm">
                    {user ? `Welcome, ${user.name}` : 'CloudBank Assistant'}
                  </h3>
                  {view === 'chatting' && selectedBot && (
                    <p className="text-xs text-white/80 mt-0.5">
                      {selectedBot === 'banking' && 'Banking Services'}
                      {selectedBot === 'advisor' && 'Financial Advisor'}
                      {selectedBot === 'knowledge' && 'Knowledge Base'}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  {user ? (
                    <>
                      <div className="text-green-300 p-2" title="Authenticated">
                        <HiOutlineShieldCheck className="w-4 h-4" />
                      </div>
                      <button 
                        onClick={logout} 
                        className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                        title="Log out"
                        aria-label="Log out"
                      >
                        <HiOutlineArrowLeftOnRectangle className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={handleLoginRequired} 
                      className="text-white hover:bg-white/20 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                      title="Log in"
                      aria-label="Log in"
                    >
                      Log In
                    </button>
                  )}
                  <button 
                    onClick={handleClose} 
                    className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                    title="Close chat"
                    aria-label="Close chat"
                  >
                    <HiOutlineXMark className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Analytics display - only show when chatting */}
              {view === 'chatting' && <AnalyticsDisplay />}
              
              {/* Main content area */}
              <div className="flex-grow overflow-hidden bg-brand-ui-02 dark:bg-dark-brand-ui-02">
                <ErrorBoundary>{renderContent()}</ErrorBoundary>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* FAB button when closed */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpen}
          className="chat-fab bg-brand-blue dark:bg-dark-brand-blue text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-navy dark:hover:bg-blue-700 transition-colors"
          aria-label="Open chat"
        >
          <HiOutlineChatBubbleOvalLeftEllipsis className="w-8 h-8" />
        </motion.button>
      )}

      {/* Login modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => dispatch({ type: 'HIDE_LOGIN_MODAL' })} 
        onSuccess={handleLoginSuccess} 
      />
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