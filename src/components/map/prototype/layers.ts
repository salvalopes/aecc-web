import type {
  CircleLayerSpecification,
  ExpressionSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import type { ThemeColors } from '@/theme/colors';
import { border, size, spacing } from '@/theme/tokens';
import { textStyles } from '@/theme/typography';
import type { MapCompany } from '@/types/api';
import { COMPANIES_SOURCE, LAYER } from '../companyLayers';

// Camadas do protótipo (A2/A3). Só especificação de estilo do MapLibre, que o maplibre-gl (web) e o
// MapLibre RN 11 (<Layer {...spec} />) aceitam iguais: o nativo da Fase B usa este mesmo ficheiro.

export type Direction = 'a' | 'b';

export const ZONES_SOURCE = 'zones';
export const PROTO_LAYER = {
  ...LAYER,
  zoneFill: 'zone-fill',
  zoneLine: 'zone-line',
  selected: 'point-selected',
} as const;
export const PROTO_POINT_LAYERS = [PROTO_LAYER.pointArea, PROTO_LAYER.pointExact];

/**
 * Raio do disco de uma zona (ENI sem opt-in, `precision: 'area'`), em metros. O ponto é o
 * centróide dos CP7 do CP4 (aecc-api docs/mapa.md); o disco só diz "algures por aqui" e nunca é
 * menor do que isto no ecrã de zoom alto, para nunca se ler como uma morada.
 */
export const ZONE_RADIUS_M = 600;
/** Abaixo deste zoom a zona é demasiado pequena para se ler; fica só o anel do centro. */
export const ZONE_MIN_ZOOM = 12;
/** Raio dos clusters: sqrt(n), de `cluster.min` (n = 2) a `cluster.max` (n ≥ 400). */
export const CLUSTER_RADIUS = { a: 60, b: 72 } as const;

const COUNT_FONT = ['Noto Sans Medium'];
const notCluster: ExpressionSpecification = ['!', ['has', 'point_count']];
const isArea: ExpressionSpecification = ['==', ['get', 'precision'], 'area'];

/** Polígono de N vértices à volta de cada zona (só as `area`; mesma fonte em web e nativo). */
export function zoneFeatures(
  points: readonly MapCompany[],
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const seen = new Set<string>();
  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  for (const p of points) {
    if (p.precision !== 'area') continue;
    const key = `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`;
    if (seen.has(key)) continue; // vários ENI no mesmo CP4 = uma zona
    seen.add(key);
    const dLat = ZONE_RADIUS_M / 111_320;
    const dLng = dLat / Math.cos((p.lat * Math.PI) / 180);
    const ring: GeoJSON.Position[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * 2 * Math.PI;
      ring.push([p.lng + dLng * Math.cos(a), p.lat + dLat * Math.sin(a)]);
    }
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: {},
    });
  }
  return { type: 'FeatureCollection', features };
}

/** sqrt(n) → raio, para que 389 se distinga de 2 sem tapar meio concelho. */
function clusterRadius(min: number, max: number): ExpressionSpecification {
  return ['interpolate', ['linear'], ['sqrt', ['get', 'point_count']], 1.4, min, 20, max];
}

type Spec =
  | CircleLayerSpecification
  | SymbolLayerSpecification
  | FillLayerSpecification
  | LineLayerSpecification;

/**
 * A "Lâmina": tudo no acento. Exata = ponto cheio; zona = disco geográfico translúcido com contorno
 * tracejado e um anel oco no centro (o alvo do toque), nunca um ponto cheio.
 *
 * B "Índice": o acento fica só para o que é exato e para os clusters; a zona passa a neutra
 * (`text2`), para que "localização exata" e "zona aproximada" se leiam como coisas diferentes e
 * não como pino normal e pino selecionado.
 */
export function prototypeLayers(colors: ThemeColors, dir: Direction): Spec[] {
  const zone = dir === 'a' ? colors.accent : colors.text2;
  const min = dir === 'a' ? spacing.md : spacing.lg;
  const max = dir === 'a' ? spacing['4xl'] : spacing['6xl'] - spacing.sm;
  return [
    {
      id: PROTO_LAYER.zoneFill,
      type: 'fill',
      source: ZONES_SOURCE,
      minzoom: ZONE_MIN_ZOOM,
      paint: { 'fill-color': zone, 'fill-opacity': dir === 'a' ? 0.12 : 0.1 },
    },
    {
      id: PROTO_LAYER.zoneLine,
      type: 'line',
      source: ZONES_SOURCE,
      minzoom: ZONE_MIN_ZOOM,
      paint: {
        'line-color': zone,
        'line-width': border.focus,
        'line-dasharray': [spacing['2xs'], spacing['2xs']],
        'line-opacity': 0.85,
      },
    },
    {
      id: PROTO_LAYER.clusters,
      type: 'circle',
      source: COMPANIES_SOURCE,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': colors.accent,
        'circle-radius': clusterRadius(min, max),
        'circle-stroke-color': dir === 'a' ? colors.surface : colors.accent,
        // B: halo do mesmo acento, mais largo quanto maior o cluster (peso sem tapar o vizinho).
        'circle-stroke-width':
          dir === 'a'
            ? border.focus
            : ['interpolate', ['linear'], ['sqrt', ['get', 'point_count']], 1.4, 0, 20, spacing.sm],
        'circle-stroke-opacity': dir === 'a' ? 1 : 0.35,
      },
    },
    {
      id: PROTO_LAYER.clusterCount,
      type: 'symbol',
      source: COMPANIES_SOURCE,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': COUNT_FONT,
        'text-size': [
          'interpolate',
          ['linear'],
          ['get', 'point_count'],
          2,
          textStyles.label.fontSize,
          400,
          textStyles.name.fontSize,
        ],
        'text-allow-overlap': true,
      },
      paint: { 'text-color': colors.onAccent },
    },
    {
      id: PROTO_LAYER.pointArea,
      type: 'circle',
      source: COMPANIES_SOURCE,
      filter: ['all', notCluster, isArea],
      paint: {
        'circle-color': colors.surface,
        'circle-radius': spacing.sm - spacing['2xs'],
        'circle-stroke-color': zone,
        'circle-stroke-width': border.focus,
      },
    },
    {
      id: PROTO_LAYER.pointExact,
      type: 'circle',
      source: COMPANIES_SOURCE,
      filter: ['all', notCluster, ['!', isArea]],
      paint: {
        'circle-color': colors.accent,
        'circle-radius': spacing.sm - spacing['2xs'],
        'circle-stroke-color': colors.surface,
        'circle-stroke-width': border.focus,
      },
    },
    {
      // Pino da ficha aberta: anel `text` à volta (muda o filtro, não a fonte).
      id: PROTO_LAYER.selected,
      type: 'circle',
      source: COMPANIES_SOURCE,
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'circle-color': colors.accent,
        'circle-opacity': 0,
        'circle-radius': size.icon.sm - spacing['2xs'],
        'circle-stroke-color': colors.text,
        'circle-stroke-width': border.accentBar,
      },
    },
  ];
}

/** Filtro da camada `selected` para um id (ou nenhum). */
export function selectedFilter(id: string | null): ExpressionSpecification {
  return ['all', notCluster, ['==', ['get', 'id'], id ?? '']];
}
