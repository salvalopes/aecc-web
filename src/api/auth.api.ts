import { apiClient } from './client';
import type {
  LoginRequest,
  LoginResponse,
  User,
  ConfirmEmailRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '@/types/api';

export const authApi = {
  login: (data: LoginRequest) => apiClient.post<LoginResponse>('/auth/token', data),
  me: () => apiClient.get<User>('/auth/me'),
  confirmEmail: (data: ConfirmEmailRequest) => apiClient.post<void>('/auth/confirm-email', data),
  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<void>('/auth/forgot-password', data),
  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post<void>('/auth/reset-password', data),
};
