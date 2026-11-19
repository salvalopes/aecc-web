import type { MapCompany } from '@/types/api';
import { MAP_BOX, isInsideMapBox } from '../mapBox';

/** [[oeste, sul], [este, norte]], a mesma forma do `fitBounds` do maplibre-gl e do MapLibre RN. */
export type Bounds = [[number, number], [number, number]];

const BOX: Bounds = [
  [MAP_BOX.minLng, MAP_BOX.minLat],
  [MAP_BOX.maxLng, MAP_BOX.maxLat],
];

function quantile(sorted: readonly number[], q: number): number {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/**
 * Enquadramento inicial (protótipo A2): os limites das empresas DENTRO da caixa do mapa (as que
 * estão fora não contam). `trim` corta essa fração em cada ponta de cada eixo, para que poucas
 * empresas longe do grupo principal (ex.: as de Lisboa) não puxem o enquadramento.
 * Sem empresas dentro da caixa, devolve a própria caixa.
 */
export function framingBounds(points: readonly MapCompany[], trim = 0): Bounds {
  const inside = points.filter((p) => isInsideMapBox(p.lat, p.lng));
  if (inside.length < 2) return BOX;
  const lngs = inside.map((p) => p.lng).sort((a, b) => a - b);
  const lats = inside.map((p) => p.lat).sort((a, b) => a - b);
  return [
    [quantile(lngs, trim), quantile(lats, trim)],
    [quantile(lngs, 1 - trim), quantile(lats, 1 - trim)],
  ];
}
