import type { MapCompany } from '@/types/api';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Área do mapa tapada pelos controlos flutuantes (px): o enquadramento e o foco evitam-na. */
export interface MapPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Props partilhadas por `CompanyMap.tsx` (MapLibre RN) e `CompanyMap.web.tsx` (maplibre-gl): um só
 * componente de mapa por plataforma. O mapa ocupa o ecrã todo; título, filtros, ficha e atribuição
 * flutuam por cima e são do `MapScreen`.
 */
export interface CompanyMapProps {
  /** Pontos já filtrados (categoria ativa). */
  points: readonly MapCompany[];
  /** Todos os pontos: o enquadramento inicial não depende do filtro. */
  framingPoints: readonly MapCompany[];
  scheme: 'light' | 'dark';
  /** Só em memória, vinda do botão "A minha posição"; nunca sai do dispositivo (regra 2). */
  userPosition: LatLng | null;
  /** Fly-to (ex.: `?company=`). Um objeto novo volta a focar. */
  focus?: LatLng | null;
  /** Pino da ficha aberta (anel `text`). */
  selectedId: string | null;
  padding: MapPadding;
  /** Toque num pino. */
  onSelectCompany: (id: string) => void;
  /** Cluster cujas folhas coincidem (vários ENI no mesmo CP4) ou cluster no zoom máximo. */
  onSelectGroup: (ids: string[]) => void;
  /** Primeiro gesto da pessoa no mapa (mover, zoom, toque): recolhe a atribuição da OSM. */
  onInteract: () => void;
  testID?: string;
}
