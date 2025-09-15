import React, { createContext, useContext, useState, useEffect } from 'react';
import ApiService from '../services/api';
import { useDebounce } from '../utils/debounce';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounced auth check to prevent request flooding
  const debouncedCheckAuth = useDebounce(() => {
    const hasToken = Boolean(localStorage.getItem('authToken'));
    if (hasToken) checkAuthStatus();
  }, 400);

  // Check if user is already logged in on app start
  useEffect(() => {
    // Only check auth status if a token exists in localStorage or cookies
    const hasToken = Boolean(localStorage.getItem('authToken'));
    if (hasToken) {
      checkAuthStatus();
    } else {
      setLoading(false);
    }
  }, []);

  // Handle tab visibility changes with debouncing
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) {
        debouncedCheckAuth();
      }
    };
    
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [debouncedCheckAuth]);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getProfile();
      setUser(response.user);
    } catch (error) {
      // User is not logged in
      setUser(null);
      // Only set error if it's not a 401 (unauthorized)
      if (error.message && !error.message.toLowerCase().includes('not authenticated')) {
        setError(error.message);
      } else {
        setError(null); // Don't show error for expected unauthenticated state
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setError(null);
      setLoading(true);
      const response = await ApiService.login(credentials);
      setUser(response.user);
      
      // Store token in localStorage
      if (response.token) {
        localStorage.setItem('authToken', response.token);
      }
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      const response = await ApiService.register(userData);
      setUser(response.user);
      
      // Store token in localStorage
      if (response.token) {
        localStorage.setItem('authToken', response.token);
      }
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await ApiService.logout();
      setUser(null);
      
      // Clear token from localStorage
      localStorage.removeItem('authToken');
    } catch (error) {
      setError(error.message);
      // Even if logout fails on server, clear local state
      setUser(null);
      localStorage.removeItem('authToken');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const response = await ApiService.updateProfile(profileData);
      setUser(response.user);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    setUser,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    isAuthenticated: !!user,
    setError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

