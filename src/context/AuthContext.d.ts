// Contrato do AuthContext. As implementações são por plataforma e o Metro escolhe o
// ficheiro certo; o tsc, que não conhece sufixos de plataforma, resolve esta declaração:
//   AuthContext.web.tsx    — PKCE no browser (cliente aecc-web), o fluxo de sempre;
//   AuthContext.native.tsx — grant password (cliente aecc-native) + SecureStore.
// Assim o pkce.ts (crypto.subtle), o window.location e o sessionStorage nunca entram no
// bundle nativo.
import type { Context, ReactElement, ReactNode } from 'react';
import type { LoginRequest, User } from '@/types/api';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  /** Web: cookie + redirect PKCE (sai da página). Nativo: grant password e navega para o diretório. */
  login: (credentials: LoginRequest) => Promise<void>;
  /** Só web. No nativo rejeita. */
  redirectToAuthorize: () => Promise<void>;
  /** Só web (rota /auth/callback). No nativo rejeita. */
  completeOAuthLogin: (code: string, state: string) => Promise<void>;
  logout: () => Promise<void>;
}

export declare const AuthContext: Context<AuthContextValue | null>;
export declare function AuthProvider(props: { children: ReactNode }): ReactElement;
