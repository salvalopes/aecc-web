/**
 * Caixa do mapa (aecc-api docs/mapa.md): valida o PUT /companies/{id}/location e serve de
 * enquadramento inicial. NÃO limita o mapa: o GET /map mostra empresas localizadas fora dela.
 */
export const MAP_BOX = { minLat: 38.62, maxLat: 38.86, minLng: -9.52, maxLng: -9.1 } as const;

export const MAP_CENTER = {
  lat: (MAP_BOX.minLat + MAP_BOX.maxLat) / 2,
  lng: (MAP_BOX.minLng + MAP_BOX.maxLng) / 2,
} as const;

export const INITIAL_ZOOM = 11;
/** Zoom ao focar uma empresa (?company=). */
export const FOCUS_ZOOM = 14;
/** Acima disto não há clusters; abaixo, o toque num cluster faz zoom (ou lista as folhas). */
export const CLUSTER_MAX_ZOOM = 16;

export function isInsideMapBox(lat: number, lng: number): boolean {
  return (
    lat >= MAP_BOX.minLat && lat <= MAP_BOX.maxLat && lng >= MAP_BOX.minLng && lng <= MAP_BOX.maxLng
  );
}
