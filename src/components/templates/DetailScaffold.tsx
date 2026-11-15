import type { ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import { useBreakpoint } from '@/theme/useBreakpoint';
import { Text } from '@/components/ds';

// T4 Detalhe (fase3-plano §4.1), direção Maré. Ecrã empurrado: o header do `Stack` dá o
// "voltar", por isso não há horizonte. Tudo alinhado à esquerda.
// sm: coluna única — `lead` (identidade ou galeria) e depois o conteúdo.
// md+: duas colunas na grelha de 1240 — `lead` à esquerda (fixa no web) e conteúdo à direita,
// com a proporção do ecrã (`leadFlex` / `contentFlex`).
const sticky = (Platform.OS === 'web'
  ? { position: 'sticky', top: 20 }
  : {}) as unknown as ViewStyle;

const factory = createStyles(({ colors, spacing, layout }) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  page: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.xl,
    gap: layout.sectionGap,
  },
  pageWide: {
    paddingHorizontal: layout.gutterWide,
    paddingTop: spacing['4xl'],
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['5xl'],
  },
  lead: { gap: spacing.xl },
  leadWide: { minWidth: layout.sidebarMin, ...sticky },
  content: { gap: layout.sectionGap },
  contentWide: { minWidth: 0 },
  section: { gap: spacing.md },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionLabel: { flexShrink: 1 },
}));

export interface DetailScaffoldProps {
  /** Identidade (empresa) ou galeria (produto). md+: coluna da esquerda. */
  lead?: ReactNode;
  children: ReactNode;
  /** Proporção das colunas em `md+` (omissão 1fr / 2fr). */
  leadFlex?: number;
  contentFlex?: number;
  /** O ecrã vive dentro de uma tab: no iOS o fim do scroll tem de passar a tab bar flutuante. */
  overTabs?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  testID?: string;
}

export function DetailScaffold({
  lead,
  children,
  leadFlex = 1,
  contentFlex = 2,
  overTabs,
  refreshing = false,
  onRefresh,
  testID,
}: DetailScaffoldProps) {
  const s = useStyles(factory);
  const { isWide } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();

  const bottom =
    insets.bottom + (overTabs && Platform.OS === 'ios' ? spacing['6xl'] * 2 : spacing['5xl']);

  return (
    <ScrollView
      testID={testID}
      style={s.screen}
      contentContainerStyle={{ paddingBottom: bottom }}
      // O header do `Stack` já está por cima; as tabs T3/T4 desligam o inset automático
      // (`managesInsets`), por isso o fundo é tratado aqui, como no `ListScaffold`.
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh && Platform.OS !== 'web' ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      <View style={[s.page, isWide ? s.pageWide : null]}>
        {lead ? (
          <View style={[s.lead, isWide ? [s.leadWide, { flex: leadFlex }] : null]}>{lead}</View>
        ) : null}
        <View style={[s.content, isWide ? [s.contentWide, { flex: contentFlex }] : null]}>
          {children}
        </View>
      </View>
    </ScrollView>
  );
}

/** Secção do conteúdo: rótulo (`label`, maiúsculas), ação opcional à direita e o corpo por baixo. */
export function DetailSection({
  label,
  action,
  children,
  testID,
}: {
  label: string;
  /** Ação da secção (ex.: "Novo produto"), alinhada à direita do rótulo. */
  action?: ReactNode;
  children: ReactNode;
  testID?: string;
}) {
  const s = useStyles(factory);
  const heading = (
    <Text variant="label" tabular accessibilityRole="header" style={s.sectionLabel}>
      {label}
    </Text>
  );
  return (
    <View testID={testID} style={s.section}>
      {action ? (
        <View style={s.sectionHead}>
          {heading}
          {action}
        </View>
      ) : (
        heading
      )}
      {children}
    </View>
  );
}
