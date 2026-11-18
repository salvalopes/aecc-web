import { apiClient } from './client';
import type {
  CompanyMapSettings,
  MapCompany,
  SetCompanyLocationRequest,
  UnlocatedCompany,
  UpdateCompanyMapSettingsRequest,
} from '@/types/api';

// Endpoints do mapa (aecc-api docs/mapa.md @ feat/mapa-api 4d4fd15). Todos exigem sessão.
// Regra 2: nenhum destes pedidos leva a posição do utilizador; o único que envia coordenadas é
// o PUT /location do Admin, com a posição da EMPRESA escrita à mão.
export const mapApi = {
  /** Empresas no mapa (`precision` decidida na API; ENI sem opt-in = zona CP4). */
  companies: (params?: { categoryId?: string }) => {
    const query = params?.categoryId
      ? `?${new URLSearchParams({ categoryId: params.categoryId })}`
      : '';
    return apiClient.get<MapCompany[]>(`/companies/map${query}`);
  },
  /** Dono ou Admin. */
  settings: (companyId: string) =>
    apiClient.get<CompanyMapSettings>(`/companies/${companyId}/map-settings`),
  /** Dono: showExactPin, hiddenFromMapByOwner · Admin: hiddenFromMapByAdmin (outro campo → 403). */
  updateSettings: (companyId: string, patch: UpdateCompanyMapSettingsRequest) =>
    apiClient.put<CompanyMapSettings>(`/companies/${companyId}/map-settings`, patch),
  /** Admin: empresas ativas e não escondidas que não aparecem no mapa, com o motivo. */
  unlocated: () => apiClient.get<UnlocatedCompany[]>('/companies/unlocated'),
  /** Admin: posição manual da empresa (só resolve o motivo "no-location"). 204, sem eco. */
  setLocation: (companyId: string, body: SetCompanyLocationRequest) =>
    apiClient.put<void>(`/companies/${companyId}/location`, body),
};
