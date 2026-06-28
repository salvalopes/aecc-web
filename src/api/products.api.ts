import { apiClient } from './client';
import type { Product, PagedResult } from '@/types/api';

export const productsApi = {
  list: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: string;
    companyId?: string;
    type?: 'Product' | 'Service';
  }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params?.search) qs.set('search', params.search);
    if (params?.categoryId) qs.set('categoryId', params.categoryId);
    if (params?.companyId) qs.set('companyId', params.companyId);
    if (params?.type) qs.set('type', params.type);
    const query = qs.toString() ? `?${qs}` : '';
    return apiClient.get<PagedResult<Product>>(`/products${query}`);
  },
  get: (id: string) => apiClient.get<Product>(`/products/${id}`),
};
