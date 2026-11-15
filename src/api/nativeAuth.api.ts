import { NetworkError } from './client';
import type { LoginRequest, TokenResponse } from '@/types/api';

// Só nativo (iOS/Android). Cliente OAuth `aecc-native` do aecc-api (docs/autenticacao.md):
// grant password + refresh token, no /connect/token. O fluxo web (PKCE, cliente aecc-web)
// fica em auth.api.ts e AuthContext.web.tsx, sem alterações.

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';
const CLIENT_ID = 'aecc-native';
// Os mesmos scopes do cliente web; `offline_access` é o que faz a API emitir o refresh token.
const SCOPE = 'openid profile email offline_access roles aecc_api';
const TIMEOUT_MS = 15_000;

/** Recusa do /connect/token: estado HTTP e o `error`/`error_description` do OAuth (RFC 6749 §5.2). */
export class TokenError extends Error {
  constructor(
    public status: number,
    public error: string | null,
    public description: string | null,
  ) {
    super(description ?? error ?? 'Erro ao obter token de acesso.');
    this.name = 'TokenError';
  }
}

// x-www-form-urlencoded à mão: não depende do URLSearchParams do runtime nativo.
function formBody(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: formBody(params),
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let error: string | null = null;
    let description: string | null = null;
    try {
      const json = await response.json();
      error = json.error ?? null;
      description = json.error_description ?? null;
    } catch {
      // corpo vazio ou não-JSON (ex.: 429 do rate limiter)
    }
    throw new TokenError(response.status, error, description);
  }

  return (await response.json()) as TokenResponse;
}

export const nativeAuthApi = {
  passwordGrant: ({ email, password }: LoginRequest) =>
    tokenRequest({
      grant_type: 'password',
      client_id: CLIENT_ID,
      username: email,
      password,
      scope: SCOPE,
    }),

  refresh: (refreshToken: string) =>
    tokenRequest({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    }),
};
