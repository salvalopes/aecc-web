import { apiClient } from './client';
import type { Category } from '@/types/api';

export const categoriesApi = {
  list: () => apiClient.get<Category[]>('/categories'),
  get: (idOrSlug: string) => apiClient.get<Category>(`/categories/${idOrSlug}`),
};
