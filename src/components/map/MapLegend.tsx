import { View } from 'react-native';
import { Text } from '@/components/ui';
import { createStyles, useStyles } from '@/theme/createStyles';
import { ZONE_RING } from './zoneRing';

// Legenda dos pinos (A1 #4): o que é exato e o que é só a zona do código postal. As formas repetem
// as camadas do mapa (companyLayers.ts) com os mesmos papéis: ponto `accent` com contorno `pinEdge`,
// anel tracejado `text2` do tamanho do símbolo da zona.
export const ZONE_LEGEND = 'Zona aproximada (código postal)';

const factory = createStyles(({ border, colors, radius, spacing }) => ({
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: spacing['2xl'],
  },
  mark: { width: ZONE_RING.box, alignItems: 'center' },
  dot: {
    width: spacing.md + spacing['2xs'] * 2,
    height: spacing.md + spacing['2xs'] * 2,
    borderRadius: radius.capsule,
    backgroundColor: colors.accent,
    borderWidth: border.focus,
    borderColor: colors.pinEdge,
  },
  zone: {
    width: (ZONE_RING.radius + ZONE_RING.stroke / 2) * 2,
    height: (ZONE_RING.radius + ZONE_RING.stroke / 2) * 2,
    borderRadius: radius.capsule,
    borderWidth: ZONE_RING.stroke,
    borderStyle: 'dashed',
    borderColor: colors.text2,
  },
}));

export function MapLegend({ testID = 'map.legend' }: { testID?: string }) {
  const s = useStyles(factory);
  return (
    <View testID={testID} style={s.legend}>
      <View style={s.item}>
        <View style={s.mark}>
          <View style={s.dot} />
        </View>
        <Text variant="meta" color="text">
          Localização exata
        </Text>
      </View>
      <View style={s.item}>
        <View style={s.mark}>
          <View style={s.zone} />
        </View>
        <Text variant="meta" color="text">
          {ZONE_LEGEND}
        </Text>
      </View>
    </View>
  );
}
