import { ScrollView, View } from 'react-native';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import { Chip } from '@/components/ds';
import { GlassGroup } from '@/components/ui/GlassSurface';
import type { Category } from '@/types/api';
import { topLevelOf } from './categories';

const factory = createStyles(({ spacing, layout }) => ({
  rows: { gap: spacing.sm },
  // O scroll vai de borda a borda; o primeiro chip alinha com a margem da página.
  bleed: { marginHorizontal: -layout.gutter },
  bleedWide: { marginHorizontal: -layout.gutterWide },
  content: { paddingHorizontal: layout.gutter },
  contentWide: { paddingHorizontal: layout.gutterWide },
  group: { flexDirection: 'row', gap: spacing.sm },
}));

export interface CategoryChipsProps {
  categories: readonly Category[];
  value: string;
  onChange: (id: string) => void;
  wide?: boolean;
}

/**
 * Chips de categoria (sm/md), sem contagens. As subcategorias da categoria ativa aparecem
 * numa segunda linha. Os `testID` `companies.category-chip-*` são o contrato dos E2E.
 */
export function CategoryChips({ categories, value, onChange, wide }: CategoryChipsProps) {
  const s = useStyles(factory);
  const { spacing } = useTheme();
  const top = topLevelOf(categories, value);
  const children = top?.children ?? [];

  const row = (items: React.ReactNode) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={wide ? s.bleedWide : s.bleed}
      contentContainerStyle={wide ? s.contentWide : s.content}
    >
      <GlassGroup spacing={spacing.md} style={s.group}>
        {items}
      </GlassGroup>
    </ScrollView>
  );

  return (
    <View style={s.rows} accessibilityLabel="Categorias">
      {row(
        <>
          <Chip
            testID="companies.category-chip-all"
            label="Todas"
            active={!value}
            onPress={() => onChange('')}
          />
          {categories.map((c) => (
            <Chip
              key={c.id}
              testID={`companies.category-chip-${c.slug}`}
              label={c.name}
              active={top?.id === c.id}
              // Tocar no ativo volta a "Todas".
              onPress={() => onChange(value === c.id ? '' : c.id)}
            />
          ))}
        </>,
      )}
      {children.length > 0
        ? row(
            children.map((ch) => (
              <Chip
                key={ch.id}
                testID={`companies.category-chip-${ch.slug}`}
                label={ch.name}
                active={value === ch.id}
                onPress={() => onChange(value === ch.id ? (top?.id ?? '') : ch.id)}
              />
            )),
          )
        : null}
    </View>
  );
}
