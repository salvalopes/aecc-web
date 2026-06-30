import { apiClient } from './client';
import type {
  User,
  LoginRequest,
  TokenResponse,
  ExchangeCodeParams,
  ConfirmEmailRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '@/types/api';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(`${BASE_URL}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'Erro ao obter token de acesso.';
    try {
      const json = await response.json();
      message = json.error_description ?? json.error ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return response.json() as Promise<TokenResponse>;
}

export const authApi = {
  loginWithCookie: (data: LoginRequest) => apiClient.post<void>('/auth/login', data),

  exchangeCode: ({ code, codeVerifier, redirectUri }: ExchangeCodeParams) =>
    tokenRequest(
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'aecc-web',
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    ),

  refreshToken: (token: string) =>
    tokenRequest(
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: 'aecc-web',
        refresh_token: token,
      }),
    ),

  me: () => apiClient.get<User>('/auth/me'),
  logout: () => apiClient.post<void>('/auth/logout', {}),
  confirmEmail: (data: ConfirmEmailRequest) => apiClient.post<void>('/auth/confirm-email', data),
  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<void>('/auth/forgot-password', data),
  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post<void>('/auth/reset-password', data),
};
