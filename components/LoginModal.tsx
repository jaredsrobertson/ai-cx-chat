// components/LoginModal.tsx
import React, { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => Promise<void>;
  message?: string;
}

export default function LoginModal({ isOpen, onClose, onLogin, message }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async () => {
    setIsLoading(true);
    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    await onLogin();
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-3a8bc2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Authentication Required</h2>
          {message && (
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          )}
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value="demo@bank.com"
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value="demo123"
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Demo Mode:</strong> Click login to continue with pre-filled credentials
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-3a8bc2 text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : (
                'Login'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}