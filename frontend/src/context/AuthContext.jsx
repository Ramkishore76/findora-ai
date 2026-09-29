import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('findora_token') || '');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check active session on mount
  useEffect(() => {
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    const savedToken = localStorage.getItem('findora_token');
    if (!savedToken) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.user) {
        setCurrentUser(res.user);
        loadNotifications();
      } else {
        logout();
      }
    } catch (err) {
      console.warn('Session verification failed, clearing token:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = () => {
    api.getNotifications().then(data => {
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter(n => !n.read).length);
      }
    }).catch(console.error);
  };

  const login = async (email, password) => {
    const data = await api.login(email, password);
    if (data.token && data.user) {
      localStorage.setItem('findora_token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      loadNotifications();
      return data;
    }
    throw new Error('Authentication failed');
  };

  const register = async (userData) => {
    const data = await api.register(userData);
    if (data.token && data.user) {
      localStorage.setItem('findora_token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      loadNotifications();
      return data;
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('findora_token');
    setToken('');
    setCurrentUser(null);
    setNotifications([]);
    setUnreadCount(0);
  };

  const currentRole = currentUser?.role === 'user' ? 'student' : (currentUser?.role || 'student');

  return (
    <AuthContext.Provider value={{
      currentUser,
      token,
      loading,
      isAuthenticated: Boolean(currentUser),
      isAdmin: currentRole === 'admin' || currentRole === 'verification_officer',
      isSuperAdmin: currentRole === 'admin',
      isOfficer: currentRole === 'verification_officer',
      isStudent: currentRole === 'student',
      role: currentRole,
      login,
      register,
      logout,
      notifications,
      unreadCount,
      refreshNotifications: loadNotifications
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
