import { useEffect } from 'react';
import { Linking, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassSurface, IconButton, Text } from '@/components/ui';
import { createStyles, useStyles } from '@/theme/createStyles';
import { GISCO_ATTRIBUTION, OSM_COPYRIGHT_URL, PROTOMAPS_URL } from '../MapAttribution';

/**
 * Atribuição do protótipo (regra 3), num canto do mapa:
 * - OSM · Protomaps: visível à entrada; recolhe no "x", na primeira interação com o mapa ou ao fim
 *   de 5 s (OSMF Attribution Guideline §1.5.2); depois, um "(i)" no canto volta a abri-la.
 * - GISCO: a Eurostat pede o agradecimento "whenever used" e não diz se pode recolher
 *   [A CONFIRMAR], por isso fica sempre visível, numa linha compacta, com o texto oficial.
 */
export const COLLAPSE_AFTER_MS = 5000;

const factory = createStyles(({ radius, spacing }) => ({
  stack: { alignItems: 'flex-end', gap: spacing.xs },
  osm: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    gap: spacing['2xs'],
  },
  gisco: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.xs,
  },
  link: { textDecorationLine: 'underline' },
  giscoRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  giscoBox: { flexShrink: 1 },
}));

const open = (url: string) => () => {
  Linking.openURL(url).catch(() => {});
};

export function PrototypeAttribution({
  collapsed,
  onCollapse,
  onExpand,
  style,
}: {
  collapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles(factory);

  useEffect(() => {
    if (collapsed) return;
    const t = setTimeout(onCollapse, COLLAPSE_AFTER_MS);
    return () => clearTimeout(t);
  }, [collapsed, onCollapse]);

  return (
    <View testID="map.attribution" style={[s.stack, style]} pointerEvents="box-none">
      {collapsed ? (
        <GlassSurface opaque elevated>
          <IconButton
            testID="map.attribution.info"
            icon="info"
            label="Fontes e licenças do mapa"
            onPress={onExpand}
          />
        </GlassSurface>
      ) : (
        <GlassSurface opaque elevated style={s.osm}>
          <Text variant="meta" color="text">
            ©{' '}
            <Text
              variant="meta"
              color="text"
              style={s.link}
              accessibilityRole="link"
              onPress={open(OSM_COPYRIGHT_URL)}
            >
              OpenStreetMap
            </Text>
            {' · '}
            <Text
              variant="meta"
              color="text"
              style={s.link}
              accessibilityRole="link"
              onPress={open(PROTOMAPS_URL)}
            >
              Protomaps
            </Text>
          </Text>
          <IconButton
            testID="map.attribution.close"
            icon="x"
            label="Recolher a atribuição"
            onPress={onCollapse}
          />
        </GlassSurface>
      )}
    </View>
  );
}

/** A linha do GISCO, sempre visível (não recolhe: [A CONFIRMAR]); quebra em duas linhas no telemóvel. */
export function GiscoAttribution({ style }: { style?: StyleProp<ViewStyle> }) {
  const s = useStyles(factory);
  return (
    <View style={[s.giscoRow, style]} pointerEvents="box-none">
      <GlassSurface opaque radius={s.gisco.borderRadius} style={[s.gisco, s.giscoBox]}>
        <Text testID="map.attribution.gisco" variant="label" color="text2">
          {GISCO_ATTRIBUTION}
        </Text>
      </GlassSurface>
    </View>
  );
}
