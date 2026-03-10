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
  logout: () => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<Response>;
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
        
        // MOBILE FIX: Only send Authorization header if the saved token is a real JWT.
        // Sending 'session_active' or other placeholders causes the backend's jwt.verify()
        // to fail with 401. On PC, the cookie fallback covers this. On mobile browsers, 
        // cross-origin cookies are often blocked, so the header is the ONLY auth mechanism.
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
          
          // Always store the fresh JWT from the server
          if (data.token && isValidJWT(data.token)) {
            setToken(data.token);
            localStorage.setItem('skrapo_token', data.token);
          } else if (!savedToken) {
            setToken('session_active'); 
          }
        } else if (res.status === 401) {
          // 401 = definitely invalid session. But only clear if we actually sent credentials.
          // If we had NO valid token AND no cookie was sent, the 401 is expected — 
          // don't clear a localStorage session that might just need a re-login with /auth/me.
          if (isValidJWT(savedToken) || !savedToken) {
            // We sent a real token and it was rejected, OR we never had a session
            console.warn('[Auth] Session invalid (401), clearing...');
            localStorage.removeItem('skrapo_user');
            localStorage.removeItem('skrapo_token');
            setUser(null);
            setToken(null);
          } else {
            // We had a non-JWT token (like 'session_active') and the cookie wasn't sent.
            // This is the mobile edge case. Keep the local session alive — 
            // the user is likely still logged in, just the cookie wasn't sent.
            // The individual page's apiFetch calls will use the real token once it's refreshed.
            console.warn('[Auth] 401 but no valid JWT was sent (likely mobile cookie issue). Keeping local session.');
          }
        }
        // For 500, network errors, etc — do nothing, keep the local session
      } catch (err) {
        console.error('[Auth] Session check failed (network):', err);
        // Network error: keep local session alive (offline/slow mobile)
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

      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

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

  const register = useCallback(async (payload: {
    name: string;
    email?: string;
    mobileNumber: string;
    password?: string;
    role: string;
    googleId?: string;
    pickupAddress?: string;
    serviceArea?: string;
    serviceRadiusKm?: number;
  }) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

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

      if (data.isNewUser) {
        return { success: true, isNewUser: true };
      }

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

  const logout = useCallback(() => {
    // Notify server to clear the cookie
    fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
      .catch(err => console.error('Logout error:', err));
      
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

    // Only send Authorization header with real JWTs
    if (isValidJWT(token)) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (res.status === 401) {
        // Only auto-logout if we actually sent valid credentials and they were rejected.
        // If no valid JWT was sent (and cookie wasn't sent either on mobile), 
        // the 401 is a cookie delivery failure, not a real session expiry.
        if (isValidJWT(token)) {
          console.warn(`[API] 401 for ${endpoint} with valid JWT. Session expired, logging out.`);
          logout();
        } else {
          console.warn(`[API] 401 for ${endpoint} but no valid JWT was sent. Skipping auto-logout.`);
        }
        return res; 
      }

      return res;
    } catch (error) {
      throw error;
    }
  }, [token, logout]);

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
        logout,
        apiFetch,
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
