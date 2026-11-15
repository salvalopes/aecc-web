import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useBreakpoint } from '@/theme/useBreakpoint';
import { useTheme } from '@/theme/ThemeContext';
import { BrandLockup } from './BrandLockup';
import { Text } from './Text';

// Horizonte da Maré (T3/T5): faixa sólida `horizon`, sem gradiente, por trás do vidro.
// sm: coluna única — lockup, título e meta à esquerda; `aside` por baixo.
// md+: título à esquerda e `aside` à direita, alinhados pela base (assimétrico, nada centrado).
const factory = createStyles(({ colors, spacing, layout }) => ({
  band: { backgroundColor: colors.horizon },
  inner: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.gutter,
    paddingBottom: spacing['3xl'],
    gap: spacing.xl,
  },
  innerWide: {
    paddingHorizontal: layout.gutterWide,
    paddingTop: spacing['5xl'],
    paddingBottom: spacing['5xl'],
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing['6xl'],
  },
  // Espaço para o elemento que sobrepõe a borda inferior (pesquisa, sidebar).
  overlap: { paddingBottom: spacing['3xl'] - layout.searchOverlap },
  overlapWide: { paddingBottom: spacing['5xl'] - layout.searchOverlap },
  hero: { gap: spacing.xs },
  heroWide: { flex: 1, minWidth: spacing[0] },
  aside: { alignSelf: 'flex-start' },
  asideWide: { flex: 1, minWidth: spacing[0], alignItems: 'flex-end' },
}));

export interface HorizonProps {
  title: string;
  /** Linha por cima do título (`label`, em `accentText`). */
  eyebrow?: string;
  /** Contagem ou contexto por baixo do título (`meta`). Aceita um nó (skeleton). */
  meta?: ReactNode;
  /** sm: por baixo do título · md+: coluna da direita (pesquisa, ação primária). */
  aside?: ReactNode;
  /** Lockup no canto superior esquerdo. Só onde não há outra presença da marca (no web `md+` está na barra). */
  brand?: boolean;
  /** Reserva espaço para um elemento que sobrepõe a borda inferior (`layout.searchOverlap`). */
  overlap?: boolean;
  testID?: string;
}

// A safe area de cima é medida na própria faixa (não na janela): dentro das NativeTabs o ecrã
// já começa por baixo da status bar e `useSafeAreaInsets()` contava-a duas vezes.
const TOP = ['top'] as const;

export function Horizon({ title, eyebrow, meta, aside, brand, overlap, testID }: HorizonProps) {
  const s = useStyles(factory);
  const { isWide } = useBreakpoint();
  const { layout, spacing } = useTheme();
  const showBrand = brand && !(Platform.OS === 'web' && isWide);

  const hero = (
    <View style={[s.hero, isWide ? s.heroWide : null]}>
      {eyebrow ? (
        <Text variant="label" color="accentText">
          {eyebrow}
        </Text>
      ) : null}
      <Text variant="hero" accessibilityRole="header">
        {title}
      </Text>
      {typeof meta === 'string' ? (
        <Text variant="meta" tabular>
          {meta}
        </Text>
      ) : (
        meta
      )}
    </View>
  );

  if (isWide) {
    return (
      <SafeAreaView testID={testID} edges={TOP} style={s.band}>
        {showBrand ? (
          <View style={[s.inner, { paddingTop: spacing['4xl'] }]}>
            <BrandLockup width={120} />
          </View>
        ) : null}
        <View
          style={[
            s.inner,
            s.innerWide,
            { paddingTop: showBrand ? spacing.xl : spacing['5xl'] },
            overlap ? s.overlapWide : null,
          ]}
        >
          {hero}
          {aside ? <View style={s.asideWide}>{aside}</View> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID={testID} edges={TOP} style={s.band}>
      <View style={[s.inner, { paddingTop: layout.gutter }, overlap ? s.overlap : null]}>
        {showBrand ? <BrandLockup width={120} /> : null}
        {hero}
        {aside ? <View style={s.aside}>{aside}</View> : null}
      </View>
    </SafeAreaView>
  );
}
