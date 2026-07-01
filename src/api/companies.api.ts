import { apiClient } from './client';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '@/types/api';

export const companiesApi = {
  list: (params?: { name?: string; categoryId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.name) qs.set('name', params.name);
    if (params?.categoryId) qs.set('categoryId', params.categoryId);
    const query = qs.toString() ? `?${qs}` : '';
    return apiClient.get<Company[]>(`/companies${query}`);
  },
  getMine: () => apiClient.get<Company[]>('/companies/mine'),
  get: (id: string) => apiClient.get<Company>(`/companies/${id}`),
  create: (data: CreateCompanyRequest) => apiClient.post<Company>('/companies', data),
  update: (id: string, data: UpdateCompanyRequest) =>
    apiClient.put<Company>(`/companies/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`/companies/${id}`),

  uploadLogo: (id: string, uri: string, name: string, mimeType: string) => {
    const formData = new FormData();
    formData.append('file', { uri, name, type: mimeType } as unknown as Blob);
    return apiClient.postMultipart<{ url: string }>(`/companies/${id}/logo`, formData);
  },
};
