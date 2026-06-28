import React, { createContext, useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setTokenGetter } from '@/api/client';
import { authApi } from '@/api/auth.api';
import type { User, LoginRequest } from '@/types/api';

const TOKEN_KEY = 'aecc_access_token';

// SecureStore doesn't work on web — use AsyncStorage as fallback
const storage = {
  get: (key: string) =>
    Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  set: (key: string, value: string) =>
    Platform.OS === 'web'
      ? AsyncStorage.setItem(key, value)
      : SecureStore.setItemAsync(key, value),
  remove: (key: string) =>
    Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Wire token into the API client on every change
  useEffect(() => {
    setTokenGetter(() => token);
  }, [token]);

  // Restore persisted token on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await storage.get(TOKEN_KEY);
        if (stored) {
          setToken(stored);
          setTokenGetter(() => stored);
          const me = await authApi.me();
          setUser(me);
        }
      } catch {
        await storage.remove(TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);
    await storage.set(TOKEN_KEY, response.accessToken);
    setToken(response.accessToken);
    setTokenGetter(() => response.accessToken);
    const me = await authApi.me();
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    await storage.remove(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
