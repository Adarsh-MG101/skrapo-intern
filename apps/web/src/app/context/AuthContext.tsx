'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config/env';

interface User {
  id: string;
  name: string;
  email: string | null;
  mobileNumber?: string;
  role: string;
  defaultRoute: string;
  pickupAddress?: string;
  serviceArea?: string;
  serviceRadiusKm?: number;
  isActive?: boolean;
  panNumber?: string;
  panCardPic?: string;
  aadharNumber?: string;
  aadharCardPic?: string;
  gstNumber?: string;
  gstCardPic?: string;
  profilePhoto?: string;
  cardNumber?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; defaultRoute?: string }>;
  register: (payload: {
    name: string;
    email?: string;
    mobileNumber: string;
    password?: string;
    role: string;
    googleId?: string;
    pickupAddress?: string;
    serviceArea?: string;
    serviceRadiusKm?: number;
  }) => Promise<{ success: boolean; error?: string; defaultRoute?: string }>;
  requestOTP: (mobileNumber: string) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (mobileNumber: string, otp: string) => Promise<{ success: boolean; error?: string; defaultRoute?: string; isNewUser?: boolean }>;
  googleLogin: (credential: string) => Promise<{ success: boolean; error?: string; defaultRoute?: string; needsPhone?: boolean; googleData?: { googleId: string; email: string; name: string; picture?: string } }>;
  forgotPassword: (contact: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithToken: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<Response>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper: check if a string looks like a real JWT (has 3 dot-separated segments)
  const isValidJWT = (t: string | null): boolean => {
    if (!t || t === 'session_active') return false;
    return t.split('.').length === 3;
  };

  // Load saved session on mount
  useEffect(() => {
    const checkSession = async () => {
      const savedUser = localStorage.getItem('skrapo_user');
      const savedToken = localStorage.getItem('skrapo_token');
      
      if (savedUser) {
        try { setUser(JSON.parse(savedUser)); } catch { /* corrupt data */ }
      }
      if (savedToken) {
        setToken(savedToken);
      }

      try {
        const headers: Record<string, string> = {};
        if (isValidJWT(savedToken)) {
          headers['Authorization'] = `Bearer ${savedToken}`;
        }

        const res = await fetch(`${API_URL}/auth/me`, {
          headers,
          credentials: 'include',
        });
        
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem('skrapo_user', JSON.stringify(data.user));
          
          if (data.token && isValidJWT(data.token)) {
            setToken(data.token);
            localStorage.setItem('skrapo_token', data.token);
          } else if (!savedToken) {
            setToken('session_active'); 
          }
        } else if (res.status === 401) {
          if (isValidJWT(savedToken) || !savedToken) {
            console.warn('[Auth] Session invalid (401), clearing...');
            localStorage.removeItem('skrapo_user');
            localStorage.removeItem('skrapo_token');
            setUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.error('[Auth] Session check failed (network):', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Login failed' };

      localStorage.setItem('skrapo_user', JSON.stringify(data.user));
      const newToken = data.token || 'session_active';
      setToken(newToken);
      localStorage.setItem('skrapo_token', newToken);
      setUser(data.user);

      return { success: true, defaultRoute: data.user.defaultRoute };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const register = useCallback(async (payload: any) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Registration failed' };

      localStorage.setItem('skrapo_user', JSON.stringify(data.user));
      const newToken = data.token || 'session_active';
      setToken(newToken);
      localStorage.setItem('skrapo_token', newToken);
      setUser(data.user);

      return { success: true, defaultRoute: data.user.defaultRoute };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const requestOTP = useCallback(async (mobileNumber: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber }),
        credentials: 'include',
      });
      const data = await res.json();
      return res.ok ? { success: true } : { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Failed to request OTP' };
    }
  }, []);

  const verifyOTP = useCallback(async (mobileNumber: string, otp: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, otp }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      if (data.isNewUser) return { success: true, isNewUser: true };

      localStorage.setItem('skrapo_user', JSON.stringify(data.user));
      const newToken = data.token || 'session_active';
      setToken(newToken);
      localStorage.setItem('skrapo_token', newToken);
      setUser(data.user);
      return { success: true, defaultRoute: data.user.defaultRoute };
    } catch {
      return { success: false, error: 'Failed to verify OTP' };
    }
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/google/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      if (data.needsPhone) {
        return { 
          success: true, 
          needsPhone: true, 
          googleData: { 
            googleId: data.googleId, 
            email: data.email, 
            name: data.name, 
            picture: data.picture 
          } 
        };
      }

      localStorage.setItem('skrapo_user', JSON.stringify(data.user));
      const newToken = data.token || 'session_active';
      setToken(newToken);
      localStorage.setItem('skrapo_token', newToken);
      setUser(data.user);
      return { success: true, defaultRoute: data.user.defaultRoute };
    } catch {
      return { success: false, error: 'Google login failed' };
    }
  }, []);

  const forgotPassword = useCallback(async (contact: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact }),
        credentials: 'include',
      });
      const data = await res.json();
      return res.ok ? { success: true } : { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Failed to request password reset' };
    }
  }, []);

  const resetPasswordWithToken = useCallback(async (token: string, newPassword: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
        credentials: 'include',
      });
      const data = await res.json();
      return res.ok ? { success: true } : { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Failed to reset password' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, { 
        method: 'POST', 
        credentials: 'include',
        keepalive: true 
      });
    } catch (err) {
      console.error('Logout server call failed:', err);
    }
      
    localStorage.removeItem('skrapo_user');
    localStorage.removeItem('skrapo_token');
    setToken(null);
    setUser(null);
  }, []);

  const apiFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    } as any;

    if (isValidJWT(token)) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (res.status === 401 && isValidJWT(token)) {
        console.warn(`[API] 401 for ${endpoint} with valid JWT. Session expired, logging out.`);
        logout();
      }

      return res;
    } catch (error) {
      throw error;
    }
  }, [token, logout]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch('/auth/me');
      if (res.ok) {
        const data = await res.json();
        const updatedUser = data.user;
        setUser(updatedUser);
        localStorage.setItem('skrapo_user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  }, [apiFetch]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        requestOTP,
        verifyOTP,
        googleLogin,
        forgotPassword,
        resetPasswordWithToken,
        logout,
        apiFetch,
        refreshUser,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
