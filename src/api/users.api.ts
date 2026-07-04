import { apiClient } from './client';
import type { ManagedUser, CreateUserRequest, UpdateUserRequest } from '@/types/api';

export const usersApi = {
  list: () => apiClient.get<ManagedUser[]>('/users'),
  create: (data: CreateUserRequest) => apiClient.post<ManagedUser>('/users', data),
  update: (id: string, data: UpdateUserRequest) =>
    apiClient.put<ManagedUser>(`/users/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`/users/${id}`),
};
