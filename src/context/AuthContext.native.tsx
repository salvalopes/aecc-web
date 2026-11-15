import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkError, setTokenGetter, setTokenRefresher } from '@/api/client';
import { authApi } from '@/api/auth.api';
import { nativeAuthApi } from '@/api/nativeAuth.api';
import type { LoginRequest, TokenResponse, User } from '@/types/api';
import type { AuthContextValue } from './AuthContext';

// Sessão nativa (iOS/Android): grant password do cliente `aecc-native` (aecc-api
// docs/autenticacao.md). O fluxo web (PKCE, window, sessionStorage) vive em
// AuthContext.web.tsx e nunca é importado aqui.
// - Access token só em memória; refresh token no SecureStore (Keychain / Keystore).
// - Renovação single-flight: antes de expirar, ao voltar ao primeiro plano e num 401.
//   Guarda sempre o refresh token novo (a API roda-o a cada renovação).
// - Renovação recusada pela API → fim de sessão. Falha de rede → a sessão em memória
//   mantém-se e o refresh token guardado também (tenta de novo mais tarde).
// - Logout: limpa a memória e o SecureStore. O OpenIddict do aecc-api não tem endpoint
//   de revogação, por isso o refresh token apagado expira sozinho no servidor (30 dias).

const REFRESH_KEY = 'aecc_refresh_token';
// O AsyncStorage apaga-se ao desinstalar a app; o Keychain do iOS não. Sem esta marca,
// uma reinstalação herdaria a sessão da instalação anterior.
const INSTALL_MARK_KEY = 'aecc_native_installed';
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
/** Renovar este tempo antes de o access token expirar (30 min no aecc-native). */
const REFRESH_MARGIN_MS = 60_000;
/** Nova tentativa depois de uma renovação falhada por rede. */
const RETRY_MS = 30_000;

const refreshStore = {
  get: () => SecureStore.getItemAsync(REFRESH_KEY, SECURE_OPTIONS),
  set: (value: string) => SecureStore.setItemAsync(REFRESH_KEY, value, SECURE_OPTIONS),
  clear: () => SecureStore.deleteItemAsync(REFRESH_KEY, SECURE_OPTIONS).catch(() => undefined),
};

const webOnly = () => Promise.reject(new Error('Este passo do login só existe na web.'));

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tokenRef = useRef<string | null>(null);
  const expiresAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<Promise<boolean> | null>(null);
  // Incrementa a cada fim de sessão: uma renovação ou login que acabe depois disso
  // (ex.: logout a meio de um refresh) é descartado em vez de ressuscitar a sessão.
  const generationRef = useRef(0);
  const refreshRef = useRef<() => Promise<boolean>>(() => Promise.resolve(false));

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const schedule = useCallback(
    (delay: number) => {
      clearTimer();
      timerRef.current = setTimeout(
        () => {
          refreshRef.current().then((ok) => {
            if (!ok && tokenRef.current) schedule(RETRY_MS);
          });
        },
        Math.max(0, delay),
      );
    },
    [clearTimer],
  );

  const endSession = useCallback(async () => {
    generationRef.current += 1;
    clearTimer();
    tokenRef.current = null;
    expiresAtRef.current = 0;
    setToken(null);
    setUser(null);
    await refreshStore.clear();
  }, [clearTimer]);

  const applyTokens = useCallback(
    async (tokens: TokenResponse) => {
      if (tokens.refresh_token) await refreshStore.set(tokens.refresh_token);
      tokenRef.current = tokens.access_token;
      expiresAtRef.current = Date.now() + tokens.expires_in * 1000;
      setToken(tokens.access_token);
      schedule(expiresAtRef.current - Date.now() - REFRESH_MARGIN_MS);
    },
    [schedule],
  );

  const refreshSession = useCallback((): Promise<boolean> => {
    if (inflightRef.current) return inflightRef.current;
    const generation = generationRef.current;
    const run = (async () => {
      try {
        const stored = await refreshStore.get();
        if (!stored) {
          if (tokenRef.current) await endSession();
          return false;
        }
        const tokens = await nativeAuthApi.refresh(stored);
        if (generation !== generationRef.current) return false;
        await applyTokens(tokens);
        return true;
      } catch (e) {
        if (e instanceof NetworkError) return false;
        if (generation === generationRef.current) await endSession();
        return false;
      } finally {
        inflightRef.current = null;
      }
    })();
    inflightRef.current = run;
    return run;
  }, [applyTokens, endSession]);

  // O cliente HTTP lê o token da ref (sempre o atual) e renova pelo single-flight.
  // Declarado antes do restauro: os efeitos correm por esta ordem.
  useEffect(() => {
    refreshRef.current = refreshSession;
    setTokenGetter(() => tokenRef.current);
    setTokenRefresher(refreshSession);
  }, [refreshSession]);

  // Arranque com sessão (H3): refresh token guardado → renovar → /auth/me. Entretanto o
  // (app)/_layout mostra o StateScreen da sessão a carregar.
  useEffect(() => {
    (async () => {
      try {
        if (!(await AsyncStorage.getItem(INSTALL_MARK_KEY))) {
          await refreshStore.clear();
          await AsyncStorage.setItem(INSTALL_MARK_KEY, '1');
        }
        if (await refreshSession()) setUser(await authApi.me());
      } catch (e) {
        // Sem utilizador não há sessão utilizável. Sem rede, o refresh token fica para
        // o próximo arranque; recusado pela API, sai.
        if (e instanceof NetworkError) {
          generationRef.current += 1;
          clearTimer();
          tokenRef.current = null;
          setToken(null);
        } else {
          await endSession();
        }
      } finally {
        setIsLoading(false);
      }
    })();
    // Só no arranque.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // De volta ao primeiro plano: os timers não correm com a app suspensa.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !tokenRef.current) return;
      if (Date.now() >= expiresAtRef.current - REFRESH_MARGIN_MS) void refreshSession();
    });
    return () => sub.remove();
  }, [refreshSession]);

  useEffect(() => clearTimer, [clearTimer]);

  // T1 no nativo: grant password → tokens → /auth/me → diretório. Tal como o login web
  // (que sai da página), no sucesso navega; os ecrãs só tratam os erros.
  const login = useCallback(
    async (credentials: LoginRequest) => {
      const tokens = await nativeAuthApi.passwordGrant(credentials);
      generationRef.current += 1;
      await applyTokens(tokens);
      try {
        setUser(await authApi.me());
      } catch (e) {
        await endSession();
        throw e;
      }
      router.replace('/companies');
    },
    [applyTokens, endSession],
  );

  const logout = useCallback(async () => {
    await endSession();
    // Apaga um eventual cookie de Identity (o confirm-email cria um). Não bloqueia.
    authApi.logout().catch(() => undefined);
  }, [endSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        redirectToAuthorize: webOnly,
        completeOAuthLogin: webOnly,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
