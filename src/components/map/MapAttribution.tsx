import { useEffect, type ReactNode } from 'react';
import { Linking, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassSurface, IconButton, Text } from '@/components/ui';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Atribuição do mapa (decisão 2 da Fase B), no canto inferior direito. A atribuição própria do
 * MapLibre fica desligada para não duplicar.
 * - OSM · Protomaps (OSMF Attribution Guideline §1.5.2 "Interactive maps"): visível à entrada;
 *   recolhe no "x", no primeiro gesto no mapa ou ao fim de 5 s. Depois fica um "(i)" de 44, que abre
 *   o painel com a atribuição completa.
 * - GISCO: a forma curta "Posições © EU GISCO" fica sempre à vista; o agradecimento oficial completo
 *   (texto do NOTICE do aecc-api, AECC.Api/Data/PostalCodes/NOTICE.md) está no painel do "(i)".
 *
 * Desktop: chip da OSM por cima do GISCO; recolhida, GISCO e "(i)" lado a lado.
 * `compact` (telemóvel e nativo, "Faixa de baixo", docs/design/mapa-refino.md §11): uma só cápsula
 * de 44, com o texto à esquerda e um só botão ("x" com a OSM aberta, "(i)" recolhida). A altura é a
 * mesma nos dois estados, e o botão de posição por cima não salta. Com `legend`, o painel do "(i)"
 * chama-se "Legenda e fontes" e mostra a legenda antes das fontes.
 */
export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
export const PROTOMAPS_URL = 'https://github.com/protomaps/basemaps';
export const GISCO_ATTRIBUTION =
  '© European Union - GISCO, 2024, postal code point dataset, Licence CC-BY-SA 4.0.';
export const GISCO_SHORT = 'Posições © EU GISCO';
export const COLLAPSE_AFTER_MS = 5000;

/** `open`: OSM visível; `collapsed`: GISCO e "(i)"; `details`: painel das fontes. */
export type AttributionState = 'open' | 'collapsed' | 'details';

const factory = createStyles(({ layout, radius, size, spacing }) => ({
  stack: { alignItems: 'flex-end', gap: spacing.xs, maxWidth: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: size.hitTarget,
    paddingLeft: spacing.lg,
    maxWidth: '100%',
  },
  lines: { flexShrink: 1, alignItems: 'flex-end' },
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
  legendBlock: { paddingBottom: spacing.xs },
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
  paused = false,
  compact = false,
  legend,
  style,
}: {
  state: AttributionState;
  onChange: (state: AttributionState) => void;
  /** Enquanto o mapa não está desenhado, os 5 s ainda não contam. */
  paused?: boolean;
  /** Uma cápsula de 44 (telemóvel e nativo). */
  compact?: boolean;
  /** Legenda dos pinos no painel do "(i)" (telemóvel e nativo: a faixa não tem legenda). */
  legend?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles(factory);
  const { radius } = useTheme();

  // OSMF: pode recolher "automatically after five seconds".
  useEffect(() => {
    if (state !== 'open' || paused) return;
    const t = setTimeout(() => onChange('collapsed'), COLLAPSE_AFTER_MS);
    return () => clearTimeout(t);
  }, [state, paused, onChange]);

  const osmText = (
    <>
      © <Link url={OSM_COPYRIGHT_URL}>OpenStreetMap</Link>
      {' · '}
      <Link url={PROTOMAPS_URL}>Protomaps</Link>
    </>
  );
  const close = (
    <IconButton
      testID="map.attribution.close"
      icon="x"
      label="Recolher a atribuição"
      onPress={() => onChange('collapsed')}
    />
  );
  const info = (
    <IconButton
      testID="map.attribution.info"
      icon="info"
      label={legend ? 'Legenda, fontes e licenças do mapa' : 'Fontes e licenças do mapa'}
      onPress={() => onChange('details')}
    />
  );

  const details =
    state === 'details' ? (
      <GlassSurface opaque elevated style={s.details} testID="map.attribution.details">
        <View style={s.detailsHead}>
          <Text variant="name" accessibilityRole="header" style={s.detailsTitle}>
            {legend ? 'Legenda e fontes' : 'Fontes e licenças'}
          </Text>
          <IconButton
            testID="map.attribution.details.close"
            icon="x"
            label={legend ? 'Fechar a legenda e as fontes' : 'Fechar as fontes e licenças'}
            onPress={() => onChange('collapsed')}
          />
        </View>
        <View style={s.detailsBody}>
          {legend ? <View style={s.legendBlock}>{legend}</View> : null}
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
    ) : null;

  if (compact) {
    return (
      <View testID="map.attribution" style={[s.stack, style]} pointerEvents="box-none">
        {details}
        <GlassSurface
          testID="map.attribution.bar"
          opaque
          elevated
          radius={radius.capsule}
          style={s.capsule}
        >
          <View style={s.lines}>
            {state === 'open' ? (
              <Text testID="map.attribution.osm" variant="meta" color="text">
                {osmText}
              </Text>
            ) : null}
            <Text testID="map.attribution.gisco" variant="label" color="text2">
              {GISCO_SHORT}
            </Text>
          </View>
          {state === 'open' ? close : info}
        </GlassSurface>
      </View>
    );
  }

  const gisco = (
    <GlassSurface
      testID="map.attribution.gisco"
      opaque
      radius={s.gisco.borderRadius}
      style={s.gisco}
    >
      <Text variant="label" color="text2">
        {GISCO_SHORT}
      </Text>
    </GlassSurface>
  );

  if (state === 'collapsed') {
    return (
      <View testID="map.attribution" style={[s.row, style]} pointerEvents="box-none">
        {gisco}
        <GlassSurface radius={radius.capsule} opaque elevated>
          {info}
        </GlassSurface>
      </View>
    );
  }

  return (
    <View testID="map.attribution" style={[s.stack, style]} pointerEvents="box-none">
      {details ?? (
        <GlassSurface
          testID="map.attribution.osm"
          opaque
          elevated
          radius={radius.capsule}
          style={s.osm}
        >
          <Text variant="meta" color="text" style={s.osmText}>
            {osmText}
          </Text>
          {close}
        </GlassSurface>
      )}
      {gisco}
    </View>
  );
}
