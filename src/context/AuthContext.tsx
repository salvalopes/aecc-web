import React, { createContext, useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setTokenGetter, setTokenRefresher } from '@/api/client';
import { authApi } from '@/api/auth.api';
import { generateCodeVerifier, generateCodeChallenge, generateState } from '@/pkce';
import type { User, LoginRequest } from '@/types/api';

const TOKEN_KEY = 'aecc_access_token';
const REFRESH_KEY = 'aecc_refresh_token';
const PKCE_VERIFIER_KEY = 'aecc_pkce_verifier';
const PKCE_STATE_KEY = 'aecc_pkce_state';

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

function getRedirectUri(): string {
  if (typeof window === 'undefined') return 'https://aecc.salv4.com/auth/callback';
  return `${window.location.origin}/auth/callback`;
}

function buildAuthorizationUrl(challenge: string, state: string): string {
  const base = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'aecc-web',
    redirect_uri: getRedirectUri(),
    scope: 'openid profile email roles aecc_api offline_access',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });
  return `${base}/connect/authorize?${params.toString()}`;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  completeOAuthLogin: (code: string, state: string) => Promise<void>;
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

  // Wire refresh token handler into the API client
  useEffect(() => {
    setTokenRefresher(async () => {
      const stored = await storage.get(REFRESH_KEY);
      if (!stored) return false;
      try {
        const tokens = await authApi.refreshToken(stored);
        await storage.set(TOKEN_KEY, tokens.access_token);
        await storage.set(REFRESH_KEY, tokens.refresh_token);
        setToken(tokens.access_token);
        setTokenGetter(() => tokens.access_token);
        return true;
      } catch {
        await storage.remove(TOKEN_KEY);
        await storage.remove(REFRESH_KEY);
        setToken(null);
        setUser(null);
        return false;
      }
    });
  }, []);

  // Restore persisted session on mount
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
        // Token expired or invalid — try refresh before giving up
        try {
          const refresh = await storage.get(REFRESH_KEY);
          if (refresh) {
            const tokens = await authApi.refreshToken(refresh);
            await storage.set(TOKEN_KEY, tokens.access_token);
            await storage.set(REFRESH_KEY, tokens.refresh_token);
            setToken(tokens.access_token);
            setTokenGetter(() => tokens.access_token);
            const me = await authApi.me();
            setUser(me);
          }
        } catch {
          await storage.remove(TOKEN_KEY);
          await storage.remove(REFRESH_KEY);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Step 1 + 2: validate credentials (sets Identity cookie), then redirect to PKCE authorize
  const login = useCallback(async (credentials: LoginRequest) => {
    await authApi.loginWithCookie(credentials);

    const verifier = await generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = generateState();

    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    sessionStorage.setItem(PKCE_STATE_KEY, state);

    window.location.href = buildAuthorizationUrl(challenge, state);
  }, []);

  // Step 3: called by the /auth/callback route after the browser returns with ?code=...
  const completeOAuthLogin = useCallback(async (code: string, state: string) => {
    const savedState = sessionStorage.getItem(PKCE_STATE_KEY);
    const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);

    if (!savedState || !verifier) {
      throw new Error('Sessão PKCE expirada. Por favor, inicia sessão novamente.');
    }
    if (state !== savedState) {
      throw new Error('Parâmetro state inválido. Possível ataque CSRF.');
    }

    const tokens = await authApi.exchangeCode({
      code,
      codeVerifier: verifier,
      redirectUri: getRedirectUri(),
    });

    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(PKCE_STATE_KEY);

    await storage.set(TOKEN_KEY, tokens.access_token);
    if (tokens.refresh_token) await storage.set(REFRESH_KEY, tokens.refresh_token);

    setToken(tokens.access_token);
    setTokenGetter(() => tokens.access_token);

    const me = await authApi.me();
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout API errors — clear local state regardless
    }
    await storage.remove(TOKEN_KEY);
    await storage.remove(REFRESH_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, completeOAuthLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
