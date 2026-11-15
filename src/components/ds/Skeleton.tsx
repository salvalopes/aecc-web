import { View, type DimensionValue } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { ListRow } from './ListGroup';

/** Barra de skeleton (estática: o shimmer fica na especificação de motion). */
export function Skeleton({ width, height = 12 }: { width: DimensionValue; height?: number }) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessible={false}
      style={{ width, height, borderRadius: radii.xs, backgroundColor: colors.raised }}
    />
  );
}

/** Linha com a geometria da `CompanyRow`. Sem `testID` `directory.row` de propósito. */
export function SkeletonRow({ last }: { last?: boolean }) {
  const { colors, size, radii } = useTheme();
  return (
    <ListRow
      last={last}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={{
          width: size.plate.md,
          height: size.plate.md,
          borderRadius: radii.plate,
          backgroundColor: colors.raised,
        }}
      />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="62%" height={14} />
        <Skeleton width="38%" />
      </View>
    </ListRow>
  );
}
