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

    console.log('Attempting login with credentials:', { username, pin: '****' });

    try {
      const result = await login(username, pin);
      
      console.log('Login result:', { success: result.success, error: result.error });
      
      if (result.success) {
        console.log('Login successful, calling success handlers');
        
        // FIXED: Call success callback first, then close
        if (onSuccess) {
          onSuccess();
        }
        
        // Small delay to ensure auth state propagates
        setTimeout(() => {
          onClose();
          // Reset form
          setUsername('demo123');
          setPin('1234');
          setError('');
        }, 100);
        
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

  // FIXED: Handle modal close properly
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
          <h2 className="text-2xl font-bold text-gray-900">Secure Login</h2>
          <p className="text-gray-600 mt-2">Please enter your credentials to access your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="Enter username"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIN
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
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Demo Credentials:</p>
            <p>Username: demo123, PIN: 1234</p>
            <p>Username: sarah456, PIN: 9876</p>
            <p>Username: mike789, PIN: 5555</p>
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
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}