import { apiClient } from './client';
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@/types/api';

export const categoriesApi = {
  list: () => apiClient.get<Category[]>('/categories'),
  get: (id: string) => apiClient.get<Category>(`/categories/${id}`),
  create: (data: CreateCategoryRequest) => apiClient.post<Category>('/categories', data),
  update: (id: string, data: UpdateCategoryRequest) =>
    apiClient.put<Category>(`/categories/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`/categories/${id}`),
};
