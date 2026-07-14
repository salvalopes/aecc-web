import { apiClient } from './client';
import { createImageFormData } from './imageUpload';
import type { Company, CompanyDirectoryEntry, CreateCompanyRequest, PagedResult, UpdateCompanyRequest } from '@/types/api';
import type { ImagePickerAsset } from 'expo-image-picker';

export const companiesApi = {
  list: (params?: { name?: string; categoryId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.name) qs.set('name', params.name);
    if (params?.categoryId) qs.set('categoryId', params.categoryId);
    const query = qs.toString() ? `?${qs}` : '';
    return apiClient.get<Company[]>(`/companies${query}`);
  },
  directory: (params?: { name?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.name) qs.set('name', params.name);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const query = qs.toString() ? `?${qs}` : '';
    return apiClient.get<PagedResult<CompanyDirectoryEntry>>(`/companies/directory${query}`);
  },
  getMine: () => apiClient.get<Company[]>('/companies/mine'),
  get: (id: string) => apiClient.get<Company>(`/companies/${id}`),
  create: (data: CreateCompanyRequest) => apiClient.post<Company>('/companies', data),
  update: (id: string, data: UpdateCompanyRequest) =>
    apiClient.put<Company>(`/companies/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`/companies/${id}`),

  uploadLogo: (id: string, asset: ImagePickerAsset) => {
    const formData = createImageFormData(asset);
    return apiClient.postMultipart<{ url: string }>(`/companies/${id}/logo`, formData);
  },
};
