import { Pressable, View, type PressableStateCallbackType } from 'react-native';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import { Text } from '@/components/ui';
import { GlassSurface } from '@/components/ui/GlassSurface';
import type { Category } from '@/types/api';
import { topLevelOf } from './categories';

const factory = createStyles(({ colors, spacing, radius, size, border }) => ({
  panel: { padding: spacing.sm, gap: spacing['2xs'] },
  heading: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: size.hitTarget - spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.plate,
    borderCurve: 'continuous',
  },
  child: { marginLeft: spacing.lg },
  hover: { backgroundColor: colors.raised },
  // Barra `accent` de 3px no item ativo (Maré): a única marca dourada do painel.
  bar: {
    position: 'absolute',
    left: spacing[0],
    top: spacing.sm,
    bottom: spacing.sm,
    width: border.accentBar,
    borderRadius: border.accentBar,
    backgroundColor: colors.accent,
  },
}));

const isHovered = (state: PressableStateCallbackType) =>
  !!(state as PressableStateCallbackType & { hovered?: boolean }).hovered;

function Item({
  label,
  active,
  onPress,
  child,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  child?: boolean;
  testID: string;
}) {
  const s = useStyles(factory);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={(state) => [
        s.item,
        child ? s.child : null,
        !active && (state.pressed || isHovered(state)) ? s.hover : null,
      ]}
    >
      {active ? <View style={s.bar} /> : null}
      <Text variant={active ? 'name' : 'body'} color={active ? 'text' : 'text2'} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export interface CategorySidebarProps {
  categories: readonly Category[];
  value: string;
  onChange: (id: string) => void;
}

/**
 * Árvore de categorias (web/tablet `lg`) num painel de vidro, sem contagens.
 * Os filhos só aparecem debaixo do pai ativo. Mesmos `testID` dos chips.
 */
export function CategorySidebar({ categories, value, onChange }: CategorySidebarProps) {
  const s = useStyles(factory);
  const { radius } = useTheme();
  const top = topLevelOf(categories, value);
  return (
    <GlassSurface radius={radius.group} elevated style={s.panel}>
      <View style={s.heading}>
        <Text variant="label">CATEGORIAS</Text>
      </View>
      <Item
        testID="companies.category-chip-all"
        label="Todas"
        active={!value}
        onPress={() => onChange('')}
      />
      {categories.map((c) => (
        <View key={c.id}>
          <Item
            testID={`companies.category-chip-${c.slug}`}
            label={c.name}
            active={value === c.id}
            onPress={() => onChange(c.id)}
          />
          {top?.id === c.id
            ? c.children.map((ch) => (
                <Item
                  key={ch.id}
                  child
                  testID={`companies.category-chip-${ch.slug}`}
                  label={ch.name}
                  active={value === ch.id}
                  onPress={() => onChange(ch.id)}
                />
              ))
            : null}
        </View>
      ))}
    </GlassSurface>
  );
}
