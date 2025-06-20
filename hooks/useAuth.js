import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to clear auth state
  const clearAuthState = useCallback(() => {
    localStorage.removeItem('authToken');
    setUser(null);
  }, []);

  // This function correctly verifies the token on page load
  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setUser(data.data.user);
      } else {
        // Clear invalid token and reset state
        console.warn('Invalid token removed:', data.error);
        clearAuthState();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      clearAuthState();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthState]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (username, pin) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        localStorage.setItem('authToken', data.data.token);
        setUser(data.data.user);
        return { success: true };
      } else {
        // Don't store token if login failed
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'A network error occurred.' };
    }
  };

  const logout = useCallback(() => {
    clearAuthState();
  }, [clearAuthState]);

  // Force refresh auth status (useful after token might have expired)
  const refreshAuth = useCallback(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const value = { 
    user, 
    isLoading, 
    login, 
    logout, 
    refreshAuth,
    isAuthenticated: !!user 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}