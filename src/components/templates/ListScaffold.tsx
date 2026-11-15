import type { ReactNode } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import { useBreakpoint } from '@/theme/useBreakpoint';
import { Horizon, type HorizonProps } from '@/components/ds';

// T3 Lista (fase3-plano §4.1), direção Maré.
// sm: horizonte → elemento a sobrepor a borda (−26, a pesquisa) → conteúdo em coluna única.
// md+: horizonte em largura total (título à esquerda, `aside` à direita) → coluna de 1240.
// lg com `sidebar`: 1fr (fixa, a sobrepor o horizonte) + 3fr (conteúdo). Nada centrado no texto.
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
    gap: spacing.xl,
  },
  pageWide: { paddingHorizontal: layout.gutterWide, gap: spacing['2xl'] },
  overlap: { marginTop: layout.searchOverlap, zIndex: 1 },
  // A primeira peça do conteúdo fica abaixo da borda do horizonte.
  first: { marginTop: spacing.xl },
  firstWide: { marginTop: spacing['3xl'] },
  split: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['4xl'],
    marginTop: layout.searchOverlap,
  },
  sidebar: { flex: 1, minWidth: layout.sidebarMin, zIndex: 1, ...sticky },
  content: {
    flex: 3,
    minWidth: 0,
    gap: spacing.lg,
    paddingTop: -layout.searchOverlap + spacing.xl,
  },
  column: { gap: spacing.lg },
}));

export interface ListScaffoldProps {
  horizon: Omit<HorizonProps, 'overlap'>;
  /** sm: sobrepõe a borda do horizonte (pesquisa). Em `md+`, a pesquisa vai para `horizon.aside`. */
  overlap?: ReactNode;
  /** `lg`: coluna fixa à esquerda (1fr). O ecrã decide quando a passa. */
  sidebar?: ReactNode;
  /** Por cima da lista (chips, alternador de vista, erro inline). */
  toolbar?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Chamado perto do fim do scroll (paginação). */
  onEndReached?: () => void;
  testID?: string;
}

const END_THRESHOLD = 480;

export function ListScaffold({
  horizon,
  overlap,
  sidebar,
  toolbar,
  children,
  refreshing = false,
  onRefresh,
  onEndReached,
  testID,
}: ListScaffoldProps) {
  const s = useStyles(factory);
  const { isWide } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();

  // iOS: as NativeTabs flutuam por cima do conteúdo; o fim da lista tem de passar a barra.
  const bottom = insets.bottom + (Platform.OS === 'ios' ? spacing['6xl'] * 2 : spacing['5xl']);

  const onScroll = onEndReached
    ? ({ nativeEvent: e }: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (e.contentOffset.y + e.layoutMeasurement.height >= e.contentSize.height - END_THRESHOLD)
          onEndReached();
      }
    : undefined;

  const hasOverlap = !isWide && !!overlap;
  const withSidebar = isWide && !!sidebar;

  const body = (
    <View style={s.column}>
      {toolbar}
      {children}
    </View>
  );

  return (
    <ScrollView
      testID={testID}
      style={s.screen}
      contentContainerStyle={{ paddingBottom: bottom }}
      // O `Horizon` já trata da safe area de cima e o `paddingBottom` passa a tab bar:
      // sem isto o iOS soma o inset automático (faixa `bg` por cima do horizonte).
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScroll={onScroll}
      scrollEventThrottle={64}
      refreshControl={
        onRefresh && Platform.OS !== 'web' ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      <Horizon {...horizon} overlap={hasOverlap || withSidebar} />
      <View style={[s.page, isWide ? s.pageWide : null]}>
        {hasOverlap ? <View style={s.overlap}>{overlap}</View> : null}
        {withSidebar ? (
          <View style={s.split}>
            <View style={s.sidebar}>{sidebar}</View>
            <View style={s.content}>{body}</View>
          </View>
        ) : (
          <View style={hasOverlap ? null : isWide ? s.firstWide : s.first}>{body}</View>
        )}
      </View>
    </ScrollView>
  );
}
