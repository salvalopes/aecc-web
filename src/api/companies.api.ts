import { apiClient } from './client';
import type { Company, PagedResult } from '@/types/api';

export const companiesApi = {
  list: (params?: { page?: number; pageSize?: number; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString() ? `?${qs}` : '';
    return apiClient.get<PagedResult<Company>>(`/companies${query}`);
  },
  get: (id: string) => apiClient.get<Company>(`/companies/${id}`),
};
