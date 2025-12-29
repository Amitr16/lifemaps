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
  const [admin, setAdmin] = useState(null); // Admin or super admin
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounced auth check to prevent request flooding
  const debouncedCheckAuth = useDebounce(() => {
    const hasToken = Boolean(localStorage.getItem('authToken'));
    if (hasToken) checkAuthStatus();
  }, 400);

  // Check if user is already logged in on app start
  useEffect(() => {
    // Check for regular user token
    const hasToken = Boolean(localStorage.getItem('authToken'));
    // Check for admin token
    const hasAdminToken = Boolean(localStorage.getItem('adminToken'));
    
    if (hasToken) {
      checkAuthStatus();
    } else if (hasAdminToken) {
      // Admin token exists - try to decode it to restore admin state
      try {
        const token = localStorage.getItem('adminToken');
        if (token) {
          // Decode JWT token to get admin info (without verification, just for UI state)
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.adminId && payload.role) {
            // Set a minimal admin object to restore state
            setAdmin({
              id: payload.adminId,
              role: payload.role,
              username: payload.username || 'Admin'
            });
            console.log('[AuthContext] Restored admin state from token');
          }
        }
      } catch (error) {
        console.error('[AuthContext] Failed to restore admin from token:', error);
        // If token is invalid, clear it
        localStorage.removeItem('adminToken');
      }
      setLoading(false);
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
      // Try to logout from server (only if user token exists)
      if (localStorage.getItem('authToken')) {
        await ApiService.logout();
      }
      setUser(null);
      setAdmin(null);
      
      // Clear tokens from localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('adminToken');
    } catch (error) {
      setError(error.message);
      // Even if logout fails on server, clear local state
      setUser(null);
      setAdmin(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('adminToken');
    }
  };

  // Admin login methods
  const superAdminLogin = async (credentials) => {
    try {
      setError(null);
      setLoading(true);
      const response = await ApiService.superAdminLogin(credentials);
      setAdmin(response.user);
      
      // Store admin token in localStorage
      if (response.token) {
        localStorage.setItem('adminToken', response.token);
        localStorage.removeItem('authToken'); // Clear user token if exists
      }
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (credentials) => {
    try {
      setError(null);
      setLoading(true);
      const response = await ApiService.adminLogin(credentials);
      setAdmin(response.user);
      
      // Store admin token in localStorage
      if (response.token) {
        localStorage.setItem('adminToken', response.token);
        localStorage.removeItem('authToken'); // Clear user token if exists
      }
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const adminLogout = async () => {
    try {
      setError(null);
      setAdmin(null);
      localStorage.removeItem('adminToken');
    } catch (error) {
      setError(error.message);
      setAdmin(null);
      localStorage.removeItem('adminToken');
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
    admin,
    setAdmin,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    isAuthenticated: !!user,
    isAdmin: !!admin,
    isSuperAdmin: admin?.role === 'super_admin',
    superAdminLogin,
    adminLogin,
    adminLogout,
    setError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

