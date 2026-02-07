import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { User } from '../types';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setState({ data: null, loading: false, error: message });
      throw err;
    }
  }, []);

  return { ...state, execute };
}

export function useUser() {
  const [user, setUserState] = useState<User | null>(() => {
    const stored = localStorage.getItem('voicequest_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const getUserId = useCallback((): number | null => user?.id ?? null, [user]);

  const getUser = useCallback((): User | null => user, [user]);

  const setUser = useCallback((newUser: User) => {
    localStorage.setItem('voicequest_user', JSON.stringify(newUser));
    setUserState(newUser);
  }, []);

  const clearUser = useCallback(() => {
    localStorage.removeItem('voicequest_user');
    setUserState(null);
  }, []);

  const login = useCallback(async (username: string) => {
    try {
      // Try logging in via backend first
      const result = await api.login(username);
      setUserState(result.user);
      localStorage.setItem('voicequest_user', JSON.stringify(result.user));
      return result.user;
    } catch (loginErr) {
      try {
        // If login fails (user not found), try registering
        const result = await api.register(username, username);
        setUserState(result.user);
        localStorage.setItem('voicequest_user', JSON.stringify(result.user));
        return result.user;
      } catch (registerErr) {
        // If backend is completely unreachable, create a local-only user
        console.warn('Backend unreachable — using offline mode');
        const offlineUser: User = {
          id: Date.now(),
          username: username.toLowerCase(),
          display_name: username,
          xp: 0,
          level: 1,
          streak: 0,
          longest_streak: 0,
          quests_completed: 0,
          created_at: new Date().toISOString()
        };
        setUserState(offlineUser);
        localStorage.setItem('voicequest_user', JSON.stringify(offlineUser));
        return offlineUser;
      }
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('voicequest_user');
    setUserState(null);
  }, []);

  return { user, getUserId, getUser, setUser, clearUser, login, logout };
}