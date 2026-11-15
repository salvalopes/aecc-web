import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  View,
  type PressableStateCallbackType,
  type ViewStyle,
} from 'react-native';
import { createStyles, useStyles } from '@/theme/createStyles';
import { spacing } from '@/theme/tokens';
import { Surface } from './Surface';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

// Tabela da Maré (T3 web `lg`): cabeçalho `raised` fixo no topo do scroll, linhas de 48.
// Nativo: não é usada (a vista Tabela só existe no web ≥ 1280).
const sticky = (Platform.OS === 'web'
  ? { position: 'sticky', top: spacing[0], zIndex: 1 }
  : {}) as unknown as ViewStyle;

const factory = createStyles(({ colors, spacing, size, border, radius }) => ({
  table: { borderWidth: border.hairline, borderColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: size.row.table,
    paddingHorizontal: spacing.lg,
  },
  header: {
    backgroundColor: colors.raised,
    borderTopLeftRadius: radius.group,
    borderTopRightRadius: radius.group,
    ...sticky,
  },
  body: { borderTopWidth: border.hairline, borderTopColor: colors.border },
  hover: { backgroundColor: colors.raised },
  cell: { minWidth: spacing[0] },
}));

export interface DataTableColumn<T> {
  key: string;
  label: string;
  /** Peso da coluna (flex). */
  flex: number;
  render: (row: T) => ReactNode;
  /** Barra do skeleton (por omissão 60%). */
  skeletonWidth?: `${number}%`;
}

export interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  keyExtractor: (row: T) => string;
  onRowPress?: (row: T) => void;
  rowTestID?: string;
  rowLabel?: (row: T) => string;
  /** Linhas de skeleton no fim (carregamento inicial ou da página seguinte). */
  loadingRows?: number;
  /** Conteúdo no lugar das linhas (vazio). */
  empty?: ReactNode;
  testID?: string;
}

const isHovered = (state: PressableStateCallbackType) =>
  !!(state as PressableStateCallbackType & { hovered?: boolean }).hovered;

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  onRowPress,
  rowTestID,
  rowLabel,
  loadingRows = 0,
  empty,
  testID,
}: DataTableProps<T>) {
  const s = useStyles(factory);
  return (
    <Surface testID={testID} style={s.table}>
      <View style={[s.row, s.header]} accessibilityRole="header">
        {columns.map((c) => (
          <Text key={c.key} variant="label" numberOfLines={1} style={[s.cell, { flex: c.flex }]}>
            {c.label.toUpperCase()}
          </Text>
        ))}
      </View>
      {rows.length === 0 && loadingRows === 0 ? empty : null}
      {rows.map((row) => (
        <Pressable
          key={keyExtractor(row)}
          testID={rowTestID}
          accessibilityRole="button"
          accessibilityLabel={rowLabel?.(row)}
          disabled={!onRowPress}
          onPress={onRowPress ? () => onRowPress(row) : undefined}
          style={(state) => [s.row, s.body, state.pressed || isHovered(state) ? s.hover : null]}
        >
          {columns.map((c) => (
            <View key={c.key} style={[s.cell, { flex: c.flex }]}>
              {c.render(row)}
            </View>
          ))}
        </Pressable>
      ))}
      {Array.from({ length: loadingRows }, (_, i) => (
        <View
          key={`sk-${i}`}
          style={[s.row, s.body]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {columns.map((c) => (
            <View key={c.key} style={[s.cell, { flex: c.flex }]}>
              <Skeleton width={c.skeletonWidth ?? '60%'} height={11} />
            </View>
          ))}
        </View>
      ))}
    </Surface>
  );
}
