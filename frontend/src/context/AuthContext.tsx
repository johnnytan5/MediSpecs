'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchJson, ApiUser } from '@/lib/api';

type AuthState = {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY = 'medispecs.auth';

function loadStored() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStored(data: { token: string; user: ApiUser }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearStored() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStored();
    if (stored?.token && stored?.user) {
      setUser(stored.user);
      setToken(stored.token);
    }
    setLoading(false);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchJson<{ user: ApiUser }>(`/auth/me`, { method: 'GET' }, token);
      setUser(data.user);
      saveStored({ token, user: data.user });
    } catch (e: any) {
      // token invalid
      setUser(null);
      setToken(null);
      clearStored();
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const data = await fetchJson<{ user: ApiUser; token: string }>(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setToken(data.token);
    saveStored({ token: data.token, user: data.user });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    const data = await fetchJson<{ user: ApiUser; token: string }>(`/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setUser(data.user);
    setToken(data.token);
    saveStored({ token: data.token, user: data.user });
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetchJson(`/auth/logout`, { method: 'POST' }, token);
      }
    } finally {
      setUser(null);
      setToken(null);
      clearStored();
    }
  }, [token]);

  const value: AuthState = useMemo(() => ({ user, token, loading, error, login, register, logout, refreshMe }), [user, token, loading, error, login, register, logout, refreshMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


