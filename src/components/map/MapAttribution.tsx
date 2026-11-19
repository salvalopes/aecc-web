import { Linking, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui';
import { createStyles, useStyles } from '@/theme/createStyles';

/**
 * Atribuição sempre visível no mapa (regra 5), igual no nativo e no web. A atribuição própria do
 * MapLibre fica desligada para não duplicar.
 * - Basemap: "© OpenStreetMap · Protomaps" (ODbL / Protomaps), com links.
 * - Posições: agradecimento oficial do GISCO, texto do NOTICE do aecc-api
 *   (AECC.Api/Data/PostalCodes/NOTICE.md; o ano "2024" está por confirmar na edição 2025).
 */
export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
export const PROTOMAPS_URL = 'https://github.com/protomaps/basemaps';
export const GISCO_ATTRIBUTION =
  '© European Union - GISCO, 2024, postal code point dataset, Licence CC-BY-SA 4.0.';

const factory = createStyles(({ colors, radius, spacing }) => ({
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing['2xs'],
  },
  link: { textDecorationLine: 'underline' },
}));

// Só abre o link quando a pessoa toca (nada é pedido a estes domínios ao carregar o mapa).
const open = (url: string) => () => {
  Linking.openURL(url).catch(() => {});
};

export function MapAttribution({ style }: { style?: StyleProp<ViewStyle> }) {
  const s = useStyles(factory);
  return (
    <View testID="map.attribution" style={[s.box, style]}>
      <Text variant="meta">
        ©{' '}
        <Text
          variant="meta"
          style={s.link}
          accessibilityRole="link"
          onPress={open(OSM_COPYRIGHT_URL)}
        >
          OpenStreetMap
        </Text>
        {' · '}
        <Text variant="meta" style={s.link} accessibilityRole="link" onPress={open(PROTOMAPS_URL)}>
          Protomaps
        </Text>
      </Text>
      <Text variant="meta">{GISCO_ATTRIBUTION}</Text>
    </View>
  );
}
