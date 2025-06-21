import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  const [username, setUsername] = useState('demo123');
  const [pin, setPin] = useState('1234');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    console.log('Attempting demo login with credentials:', { username, pin: '****' });

    try {
      const result = await login(username, pin);
      
      console.log('Login result:', { success: result.success, error: result.error });
      
      if (result.success) {
        console.log('Login successful, triggering callbacks');
        
        // Reset form state
        setUsername('demo123');
        setPin('1234');
        setError('');
        
        // Call success callback first
        if (onSuccess) {
          onSuccess();
        }
        
        // Close modal after small delay to ensure auth state propagates
        setTimeout(() => {
          onClose();
        }, 200);
        
      } else {
        console.error('Login failed:', result.error);
        setError(result.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    console.log('Login modal closed/cancelled');
    
    // Reset form state
    setError('');
    setIsLoading(false);
    
    // Call the close handler
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-banking-blue rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Demo Login</h2>
          <p className="text-gray-600 mt-2">This is a demonstration with mock credentials</p>
        </div>

        {/* Demo Warning Banner */}
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">Demo Mode</p>
          </div>
          <p className="text-sm mt-1">These are test credentials for demonstration purposes only.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" id="demo-login-form">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Demo Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="Enter username"
              required
              disabled={isLoading}
              autoComplete="username"
              data-testid="demo-username"
              name="demo-username"
              form="demo-login-form"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Demo PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="input-field"
              placeholder="Enter 4-digit PIN"
              maxLength="4"
              required
              disabled={isLoading}
              autoComplete="current-password"
              data-testid="demo-pin"
              name="demo-pin"
              form="demo-login-form"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Available Demo Accounts:</p>
            <div className="space-y-1">
              <p>👤 Username: demo123, PIN: 1234</p>
              <p>👤 Username: sarah456, PIN: 9876</p>
              <p>👤 Username: mike789, PIN: 5555</p>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={isLoading}
              form="demo-login-form"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing In...
                </div>
              ) : (
                'Demo Sign In'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}