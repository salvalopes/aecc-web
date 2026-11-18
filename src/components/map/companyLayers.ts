import type {
  CircleLayerSpecification,
  ExpressionSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import type { ThemeColors } from '@/theme/colors';
import { border, spacing } from '@/theme/tokens';
import { textStyles } from '@/theme/typography';

/** Ids das fontes e camadas próprias (nativo e web usam as mesmas definições). */
export const COMPANIES_SOURCE = 'companies';
export const ME_SOURCE = 'me';
export const LAYER = {
  clusters: 'clusters',
  clusterCount: 'cluster-count',
  pointArea: 'point-area',
  pointExact: 'point-exact',
  me: 'me',
} as const;
export const POINT_LAYERS = [LAYER.pointArea, LAYER.pointExact];

// Fonte dos números dos clusters: a mesma família do basemap, alojada no nosso servidor (T1).
const COUNT_FONT = ['Noto Sans Medium'];

const notCluster: ExpressionSpecification = ['!', ['has', 'point_count']];

/**
 * Camadas dos pinos (mapa-plano W3). Cores só de papéis do tema; o `accent` é dos pinos.
 * - exato: círculo cheio `accent` com contorno `surface`;
 * - zona (ENI sem opt-in, `precision: 'area'`): disco maior `accentSoft` com contorno `accent`
 *   e um ponto central pequeno, para ler como "zona aproximada" e não como morada.
 */
export function companyLayers(
  colors: ThemeColors,
): (CircleLayerSpecification | SymbolLayerSpecification)[] {
  return [
    {
      id: LAYER.clusters,
      type: 'circle',
      source: COMPANIES_SOURCE,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': colors.accent,
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          spacing.lg,
          10,
          spacing.xl,
          50,
          spacing['2xl'],
        ],
        'circle-stroke-color': colors.surface,
        'circle-stroke-width': border.focus,
      },
    },
    {
      id: LAYER.clusterCount,
      type: 'symbol',
      source: COMPANIES_SOURCE,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': COUNT_FONT,
        'text-size': textStyles.meta.fontSize,
        'text-allow-overlap': true,
      },
      paint: { 'text-color': colors.onAccent },
    },
    {
      id: LAYER.pointArea,
      type: 'circle',
      source: COMPANIES_SOURCE,
      filter: ['all', notCluster, ['==', ['get', 'precision'], 'area']],
      paint: {
        'circle-color': colors.accentSoft,
        'circle-radius': spacing.xl,
        'circle-stroke-color': colors.accent,
        'circle-stroke-width': border.focus,
      },
    },
    {
      id: LAYER.pointExact,
      type: 'circle',
      source: COMPANIES_SOURCE,
      filter: ['all', notCluster, ['==', ['get', 'precision'], 'exact']],
      paint: {
        'circle-color': colors.accent,
        'circle-radius': spacing.sm,
        'circle-stroke-color': colors.surface,
        'circle-stroke-width': border.focus,
      },
    },
  ];
}

/** "A sua posição": círculo `info` com contorno `surface` (fonte `me`). */
export function meLayer(colors: ThemeColors): CircleLayerSpecification {
  return {
    id: LAYER.me,
    type: 'circle',
    source: ME_SOURCE,
    paint: {
      'circle-color': colors.info,
      'circle-radius': spacing.sm,
      'circle-stroke-color': colors.surface,
      'circle-stroke-width': border.focus,
    },
  };
}
