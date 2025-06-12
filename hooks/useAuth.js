import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only check auth status on app load, not constantly
    if (typeof window !== 'undefined') {
      checkAuthStatus();
    }
  }, []); // Empty deps - only run once

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('Checking auth status, token:', token ? 'Present' : 'Missing');
      
      if (token) {
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Auth verify response:', response.status);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Setting user data:', userData.user);
          setUser(userData.user);
        } else {
          console.log('Token invalid, removing');
          localStorage.removeItem('authToken');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
    } finally {
      console.log('Auth check complete, isLoading = false');
      setIsLoading(false);
    }
  };

  const login = async (username, pin) => {
    try {
      console.log('Attempting login for:', username);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, pin }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        console.log('Setting user after login:', data.user);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
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