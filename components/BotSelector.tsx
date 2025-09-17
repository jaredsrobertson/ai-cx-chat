// components/BotSelector.tsx
import React from 'react';

interface BotSelectorProps {
  onSelectBot: (bot: 'dialogflow' | 'lex') => void;
  hasResumeOption?: boolean;
  onResume?: () => void;
}

export default function BotSelector({ onSelectBot, hasResumeOption = false, onResume }: BotSelectorProps) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Choose Your Assistant</h2>
      <p className="text-sm text-gray-600 mb-6">Select which AI assistant you'd like to chat with today</p>
      
      {hasResumeOption && onResume && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 mb-2">You have a previous conversation</p>
          <button
            onClick={onResume}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Resume Previous Chat
          </button>
        </div>
      )}

      <div className="space-y-3">
        {/* Dialogflow Bot */}
        <button
          onClick={() => onSelectBot('dialogflow')}
          className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="ml-4 text-left">
              <h3 className="text-lg font-semibold text-gray-900">Banking Assistant</h3>
              <p className="text-sm text-gray-600 mt-1">Powered by Google Dialogflow</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Check Balance</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Transfer Funds</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Transactions</span>
              </div>
            </div>
          </div>
        </button>

        {/* Lex Bot */}
        <button
          onClick={() => onSelectBot('lex')}
          className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all group"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4 text-left">
              <h3 className="text-lg font-semibold text-gray-900">Support FAQ Bot</h3>
              <p className="text-sm text-gray-600 mt-1">Powered by Amazon Lex</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">Account Help</span>
                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">Security</span>
                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">General FAQ</span>
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Both assistants support quick replies and agent transfer
        </p>
      </div>
    </div>
  );
}