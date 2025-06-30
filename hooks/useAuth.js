import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../lib/utils';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    logger.debug('Auth state updated', { 
      user: user?.name || null, 
      isAuthenticated: !!user,
      isLoading 
    });
  }, [user, isLoading]);

  const clearAuth = useCallback(() => {
    logger.debug('Clearing auth state');
    localStorage.removeItem('authToken');
    setUser(null);
  }, []);

  const verifyToken = useCallback(async () => {
    logger.debug('Verifying token...');
    const token = localStorage.getItem('authToken');
    if (!token) {
      logger.debug('No token found');
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
          logger.debug('Token verified, setting user', { userName: data.data.user.name });
          setUser(data.data.user);
        } else {
          logger.warn('Token verification failed', { error: data.error });
          clearAuth();
        }
      } else {
        logger.warn('Token verification request failed', { status: response.status });
        clearAuth();
      }
    } catch (error) {
      logger.error('Auth verification error', error);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const login = async (username, pin) => {
    logger.debug('Attempting login', { username });
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        logger.info('Login successful, storing token and setting user');
        localStorage.setItem('authToken', data.data.token);
        setUser(data.data.user);
        return { success: true };
      } else {
        logger.warn('Login failed', { error: data.error });
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      logger.error('Login network error', error);
      return { success: false, error: 'A network error occurred.' };
    }
  };

  const logout = useCallback(() => {
    logger.info('User logout', { username: user?.username });
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