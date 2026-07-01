import { apiClient } from './client';
import type { Product, ProductImage, CreateProductRequest, UpdateProductRequest } from '@/types/api';

export const productsApi = {
  list: (params?: {
    categoryId?: string;
    companyId?: string;
    type?: 'Product' | 'Service';
  }) => {
    const qs = new URLSearchParams();
    if (params?.categoryId) qs.set('categoryId', params.categoryId);
    if (params?.companyId) qs.set('companyId', params.companyId);
    if (params?.type) qs.set('type', params.type);
    const query = qs.toString() ? `?${qs}` : '';
    return apiClient.get<Product[]>(`/products${query}`);
  },
  getMine: (companyId: string) =>
    apiClient.get<Product[]>(`/products/mine?companyId=${companyId}`),
  get: (id: string) => apiClient.get<Product>(`/products/${id}`),
  create: (data: CreateProductRequest) => apiClient.post<Product>('/products', data),
  update: (id: string, data: UpdateProductRequest) =>
    apiClient.put<Product>(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete<void>(`/products/${id}`),

  addImage: (productId: string, uri: string, name: string, mimeType: string) => {
    const formData = new FormData();
    formData.append('file', { uri, name, type: mimeType } as unknown as Blob);
    return apiClient.postMultipart<ProductImage>(`/products/${productId}/images`, formData);
  },
  deleteImage: (productId: string, imageId: string) =>
    apiClient.delete<void>(`/products/${productId}/images/${imageId}`),
  featureImage: (productId: string, imageId: string) =>
    apiClient.patch<ProductImage>(`/products/${productId}/images/${imageId}/feature`),
};
