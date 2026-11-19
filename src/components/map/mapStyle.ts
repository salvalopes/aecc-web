import type { StyleSpecification } from 'maplibre-gl';
import mareDark from './styles/mare-dark.json';
import mareLight from './styles/mare-light.json';

/**
 * Base dos tiles, glyphs e sprites do mapa (mapa-plano §2.3, T1): o nosso servidor, nunca um
 * terceiro. Configurável por `EXPO_PUBLIC_TILES_URL` (os E2E usam a fixture local).
 */
export const TILES_URL = process.env.EXPO_PUBLIC_TILES_URL ?? 'https://aecc.salv4.com/tiles';

/** Atribuição dos dados do basemap (ODbL/OSM + Protomaps); a do GISCO está em `MapAttribution`. */
export const BASEMAP_ATTRIBUTION = '© OpenStreetMap · Protomaps';

const LAYERS = {
  light: mareLight.layers,
  dark: mareDark.layers,
} as unknown as Record<'light' | 'dark', StyleSpecification['layers']>;

/**
 * Estilo Maré completo (W2): as `layers` geradas por `scripts/map/build-styles.mjs` mais as
 * fontes do nosso servidor. Trocar de tema não faz pedidos novos de tiles.
 */
export function buildMapStyle(
  scheme: 'light' | 'dark',
  tilesUrl: string = TILES_URL,
): StyleSpecification {
  return {
    version: 8,
    glyphs: `${tilesUrl}/fonts/{fontstack}/{range}.pbf`,
    sprite: `${tilesUrl}/sprites/v4/${scheme}`,
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${tilesUrl}/cascais.pmtiles`,
        attribution: BASEMAP_ATTRIBUTION,
      },
    },
    layers: LAYERS[scheme],
  };
}
