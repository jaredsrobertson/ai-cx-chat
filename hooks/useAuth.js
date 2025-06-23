import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debug: Log all auth state changes
  useEffect(() => {
    console.log('🔐 Auth state updated:', { 
      user: user?.name || null, 
      isAuthenticated: !!user,
      isLoading 
    });
  }, [user, isLoading]);

  // Simplified token management
  const clearAuth = useCallback(() => {
    console.log('🧹 Clearing auth state');
    localStorage.removeItem('authToken');
    setUser(null);
  }, []);

  // Streamlined auth verification
  const verifyToken = useCallback(async () => {
    console.log('🔍 Verifying token...');
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('❌ No token found');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Token verified, setting user:', data.data.user.name);
          setUser(data.data.user);
        } else {
          console.log('❌ Token verification failed:', data.error);
          clearAuth();
        }
      } else {
        console.log('❌ Token verification request failed:', response.status);
        clearAuth();
      }
    } catch (error) {
      console.error('❌ Auth verification error:', error);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth]);

  // Initialize auth on mount
  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  // Simplified login function
  const login = async (username, pin) => {
    console.log('🔑 Attempting login for:', username);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Login successful, storing token and setting user');
        localStorage.setItem('authToken', data.data.token);
        setUser(data.data.user);
        console.log('✅ Auth state will update on the next render.');
        return { success: true };
      } else {
        console.log('❌ Login failed:', data.error);
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('❌ Login network error:', error);
      return { success: false, error: 'A network error occurred.' };
    }
  };

  // Simplified logout
  const logout = useCallback(() => {
    console.log('🚪 User logout:', user?.username);
    clearAuth();
  }, [clearAuth, user?.username]);

  const value = useMemo(() => ({ 
    user, 
    isLoading, 
    login, 
    logout, 
    refreshAuth: verifyToken,
    isAuthenticated: !!user 
  }), [user, isLoading, login, logout, verifyToken]);

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