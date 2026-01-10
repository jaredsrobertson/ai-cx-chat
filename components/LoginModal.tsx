'use client';

import React, { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import BaseModal from './BaseModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  message?: string;
}

const AUTH_SYNC_DELAY = 1500;

export default function LoginModal({ isOpen, onClose, onSuccess, message }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'idle' | 'authenticating' | 'syncing'>('idle');
  const [error, setError] = useState('');
  const { update } = useSession();

  const handleLogin = async () => {
    setIsLoading(true);
    setLoadingStage('authenticating');
    setError('');

    try {
      const result = await signIn('credentials', {
        email: 'demo@bank.com',
        password: 'demo123',
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials');
        setIsLoading(false);
        setLoadingStage('idle');
        return;
      }

      // Force session refresh
      setLoadingStage('syncing');
      await update();
      
      // Wait for server session to sync
      await new Promise(resolve => setTimeout(resolve, AUTH_SYNC_DELAY));
      
      // Close modal
      onClose();
      
      // Small delay for UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Execute the success callback (retry the pending message)
      await onSuccess();
      
    } catch (error) {
      console.error('Login exception:', error);
      setError('An error occurred');
    } finally {
      setIsLoading(false);
      setLoadingStage('idle');
    }
  };

  const icon = (
    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Authentication Required" 
      icon={icon}
    >
      {message && (
        <p className="mt-2 text-sm text-gray-600 mb-6">{message}</p>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input 
            type="email" 
            value="demo@bank.com" 
            readOnly 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input 
            type="password" 
            value="demo123" 
            readOnly 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600" 
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
          <strong>Demo Mode:</strong> Pre-filled for your convenience.
        </div>

        {/* Loading Stage Indicator */}
        {loadingStage !== 'idle' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>
              {loadingStage === 'authenticating' && 'Authenticating...'}
              {loadingStage === 'syncing' && 'Syncing session...'}
            </span>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-sm text-center">{error}</div>
        )}

        <div className="flex gap-3">
          <button 
            onClick={onClose} 
            disabled={isLoading} 
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          
          <button 
            onClick={handleLogin} 
            disabled={isLoading} 
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Login'
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}