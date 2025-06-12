import { useState, forwardRef } from 'react';
import ChatTabs from './ChatTabs';
import VoiceControls from '../voice/VoiceControls';
import LoginModal from '../auth/LoginModal';
import { useAuth } from '../../hooks/useAuth';

const ChatWidget = forwardRef((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('banking');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user, logout } = useAuth();

  return (
    <>
      {/* Chat Toggle Button - Dynamic Size */}
      <button
        data-chat-toggle="true"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 ${isOpen ? 'w-14 h-14' : 'w-20 h-20'} bg-banking-blue hover:bg-banking-navy text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center z-40 ${!isOpen ? 'animate-pulse hover:animate-none' : ''}`}
        style={{ boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)' }}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat Widget */}
      <div className={`fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 z-30 chat-widget ${isOpen ? 'open' : 'closed'}`}>
        {/* Header */}
        <div className="bg-banking-blue text-white p-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">SecureBank Assistant</h3>
              <p className="text-xs opacity-90">
                {user ? `Welcome, ${user.name}` : 'How can I help you today?'}
              </p>
            </div>
          </div>
          
          {user && (
            <button
              onClick={logout}
              className="text-white hover:text-gray-200 text-sm"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('banking')}
            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'banking'
                ? 'border-banking-blue text-banking-blue bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            🏦 Account Assistant
          </button>
          <button
            onClick={() => setActiveTab('advisor')}
            className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'advisor'
                ? 'border-banking-blue text-banking-blue bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            💡 Financial Advisor
          </button>
        </div>

        {/* Chat Content */}
        <ChatTabs 
          activeTab={activeTab} 
          onLoginRequired={() => setShowLoginModal(true)}
        />

        {/* Voice Controls */}
        <VoiceControls activeTab={activeTab} />
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => setShowLoginModal(false)}
      />
    </>
  );
});

ChatWidget.displayName = 'ChatWidget';

export default ChatWidget;