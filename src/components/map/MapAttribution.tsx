import { useEffect } from 'react';
import { Linking, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassSurface, IconButton, Text } from '@/components/ui';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Atribuição do mapa (decisão 2 da Fase B), no canto inferior direito, igual no nativo e na web. A
 * atribuição própria do MapLibre fica desligada para não duplicar.
 * - OSM · Protomaps (OSMF Attribution Guideline §1.5.2 "Interactive maps"): visível à entrada;
 *   recolhe no "x", no primeiro gesto no mapa ou ao fim de 5 s. Depois fica um "(i)" de 44, que abre
 *   "Fontes e licenças" com a atribuição completa.
 * - GISCO: a forma curta "Posições © EU GISCO" fica sempre à vista; o agradecimento oficial completo
 *   (texto do NOTICE do aecc-api, AECC.Api/Data/PostalCodes/NOTICE.md) está no painel do "(i)".
 */
export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
export const PROTOMAPS_URL = 'https://github.com/protomaps/basemaps';
export const GISCO_ATTRIBUTION =
  '© European Union - GISCO, 2024, postal code point dataset, Licence CC-BY-SA 4.0.';
export const GISCO_SHORT = 'Posições © EU GISCO';
export const COLLAPSE_AFTER_MS = 5000;

/** `open`: chip da OSM; `collapsed`: só o "(i)"; `details`: painel "Fontes e licenças". */
export type AttributionState = 'open' | 'collapsed' | 'details';

const factory = createStyles(({ layout, radius, spacing }) => ({
  stack: { alignItems: 'flex-end', gap: spacing.xs, maxWidth: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
  osm: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    flexShrink: 1,
    maxWidth: '100%',
  },
  osmText: { flexShrink: 1 },
  gisco: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.xs,
    flexShrink: 1,
  },
  details: {
    width: layout.formMaxWidth - spacing['4xl'],
    maxWidth: '100%',
    paddingLeft: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  detailsHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailsTitle: { flex: 1 },
  detailsBody: { paddingRight: spacing.lg, gap: spacing.sm },
  link: { textDecorationLine: 'underline' },
}));

// Só abre o link quando a pessoa toca (nada é pedido a estes domínios ao carregar o mapa).
const open = (url: string) => () => {
  Linking.openURL(url).catch(() => {});
};

function Link({ url, children }: { url: string; children: string }) {
  const s = useStyles(factory);
  return (
    <Text variant="meta" color="text" style={s.link} accessibilityRole="link" onPress={open(url)}>
      {children}
    </Text>
  );
}

export function MapAttribution({
  state,
  onChange,
  style,
}: {
  state: AttributionState;
  onChange: (state: AttributionState) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles(factory);
  const { radius } = useTheme();

  // OSMF: pode recolher "automatically after five seconds".
  useEffect(() => {
    if (state !== 'open') return;
    const t = setTimeout(() => onChange('collapsed'), COLLAPSE_AFTER_MS);
    return () => clearTimeout(t);
  }, [state, onChange]);

  const gisco = (
    <GlassSurface opaque radius={s.gisco.borderRadius} style={s.gisco}>
      <Text testID="map.attribution.gisco" variant="label" color="text2">
        {GISCO_SHORT}
      </Text>
    </GlassSurface>
  );

  if (state === 'collapsed') {
    return (
      <View testID="map.attribution" style={[s.row, style]} pointerEvents="box-none">
        {gisco}
        <GlassSurface radius={radius.capsule} opaque elevated>
          <IconButton
            testID="map.attribution.info"
            icon="info"
            label="Fontes e licenças do mapa"
            onPress={() => onChange('details')}
          />
        </GlassSurface>
      </View>
    );
  }

  return (
    <View testID="map.attribution" style={[s.stack, style]} pointerEvents="box-none">
      {state === 'details' ? (
        <GlassSurface opaque elevated style={s.details} testID="map.attribution.details">
          <View style={s.detailsHead}>
            <Text variant="name" accessibilityRole="header" style={s.detailsTitle}>
              Fontes e licenças
            </Text>
            <IconButton
              testID="map.attribution.details.close"
              icon="x"
              label="Fechar as fontes e licenças"
              onPress={() => onChange('collapsed')}
            />
          </View>
          <View style={s.detailsBody}>
            <Text variant="meta" color="text">
              Dados do mapa © <Link url={OSM_COPYRIGHT_URL}>colaboradores do OpenStreetMap</Link>,
              licença ODbL.
            </Text>
            <Text variant="meta" color="text">
              Mapa base: <Link url={PROTOMAPS_URL}>Protomaps</Link>.
            </Text>
            <Text testID="map.attribution.gisco-full" variant="meta" color="text">
              Posições dos códigos postais: {GISCO_ATTRIBUTION}
            </Text>
          </View>
        </GlassSurface>
      ) : (
        <GlassSurface opaque elevated radius={radius.capsule} style={s.osm}>
          <Text variant="meta" color="text" style={s.osmText}>
            © <Link url={OSM_COPYRIGHT_URL}>OpenStreetMap</Link>
            {' · '}
            <Link url={PROTOMAPS_URL}>Protomaps</Link>
          </Text>
          <IconButton
            testID="map.attribution.close"
            icon="x"
            label="Recolher a atribuição"
            onPress={() => onChange('collapsed')}
          />
        </GlassSurface>
      )}
      {gisco}
    </View>
  );
}
