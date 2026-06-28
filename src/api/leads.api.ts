import { apiClient } from './client';
import type { Lead, CreateLeadRequest } from '@/types/api';

export const leadsApi = {
  create: (data: CreateLeadRequest) => apiClient.post<Lead>('/leads', data),
  myLeads: () => apiClient.get<Lead[]>('/leads/me'),
};
