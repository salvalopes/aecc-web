import { View } from 'react-native';
import { Text } from '@/components/ui';
import { createStyles, useStyles } from '@/theme/createStyles';

// Legenda dos pinos (A1 #4): o que é exato e o que é só a zona do código postal. As formas repetem
// as camadas do mapa (companyLayers.ts) com os mesmos papéis: ponto `accent` com contorno `pinEdge`,
// anel tracejado `text2` do tamanho do símbolo da zona (ZONE_RING em zoneRing.ts: caixa 24, anel de
// 16 com traço de 2). Não importa o zoneRing.ts: ficaria partilhado com o chunk do mapa e o Metro
// punha-o no JS inicial.
export const ZONE_LEGEND = 'Zona aproximada (código postal)';

const factory = createStyles(({ border, colors, radius, size, spacing }) => ({
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: spacing['2xl'],
    flexShrink: 1,
  },
  // Numa faixa estreita (telemóvel, ao lado da atribuição), o rótulo quebra em 2 linhas.
  label: { flexShrink: 1 },
  mark: { width: size.icon.lg, alignItems: 'center' },
  dot: {
    width: spacing.md + spacing['2xs'] * 2,
    height: spacing.md + spacing['2xs'] * 2,
    borderRadius: radius.capsule,
    backgroundColor: colors.accent,
    borderWidth: border.focus,
    borderColor: colors.pinEdge,
  },
  zone: {
    width: spacing.lg,
    height: spacing.lg,
    borderRadius: radius.capsule,
    borderWidth: border.focus,
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
        <Text variant="meta" color="text" style={s.label}>
          Localização exata
        </Text>
      </View>
      <View style={s.item}>
        <View style={s.mark}>
          <View style={s.zone} />
        </View>
        <Text variant="meta" color="text" style={s.label}>
          {ZONE_LEGEND}
        </Text>
      </View>
    </View>
  );
}
