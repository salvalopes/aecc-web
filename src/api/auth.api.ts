import { apiClient } from './client';
import type { LoginRequest, LoginResponse, User } from '@/types/api';

export const authApi = {
  login: (data: LoginRequest) => apiClient.post<LoginResponse>('/auth/token', data),
  me: () => apiClient.get<User>('/auth/me'),
};
