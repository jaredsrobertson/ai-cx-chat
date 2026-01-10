import React from 'react';
import BaseModal from './BaseModal';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentModal({ isOpen, onClose }: AgentModalProps) {
  const icon = (
    <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
    </svg>
  );

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Connecting to Agent..." 
      icon={icon}
    >
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Demo Mode:</strong> In a production environment, this would hand off the WebSocket connection to a human support agent platform (like Salesforce Service Cloud or Genesys).
        </p>
      </div>

      <div className="space-y-3 mb-8">
        <p className="text-gray-500 text-sm">
          The conversation context and authentication token would be securely passed to the agent console.
        </p>
      </div>

      <button
        type="button"
        className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-3 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        onClick={onClose}
      >
        Return to Chat Demo
      </button>
    </BaseModal>
  );
}