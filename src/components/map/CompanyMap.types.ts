import type { MapCompany } from '@/types/api';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Props partilhadas por `CompanyMap.tsx` (MapLibre RN) e `CompanyMap.web.tsx` (maplibre-gl). */
export interface CompanyMapProps {
  points: readonly MapCompany[];
  scheme: 'light' | 'dark';
  /** Só em memória, vinda do botão "A minha posição"; nunca sai do dispositivo (regra 2). */
  userPosition: LatLng | null;
  /** Fly-to (ex.: `?company=`). Um objeto novo volta a focar. */
  focus?: LatLng | null;
  /** Toque num pino. */
  onSelectCompany: (id: string) => void;
  /** Cluster cujas folhas coincidem (vários ENI no mesmo CP4) ou cluster no zoom máximo. */
  onSelectGroup: (ids: string[]) => void;
  /** Distância da atribuição ao fundo (tab bar flutuante das NativeTabs / barra do web). */
  insetBottom?: number;
  testID?: string;
}
