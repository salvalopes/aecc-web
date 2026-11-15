import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import { useBreakpoint } from '@/theme/useBreakpoint';
import { BrandLockup, Surface, Text, TextLink, type TextLinkProps } from '@/components/ui';

// T1 Autenticação (fase3-plano §4.1), direção Maré.
// sm: faixa `horizon` com o lockup e o título à esquerda; o formulário numa única superfície
//     que sobrepõe a borda do horizonte (o mesmo −26 da pesquisa do diretório).
// md+: split assimétrico 5fr/7fr — painel `horizon` com a marca à esquerda, formulário numa
//     coluna de 400px alinhada à esquerda, sobre `bg` e sem caixa. Nada centrado.
const factory = createStyles(({ colors, spacing, layout, border }) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },

  // sm
  horizon: {
    backgroundColor: colors.horizon,
    paddingHorizontal: layout.gutter,
    paddingBottom: spacing['5xl'] - layout.searchOverlap,
    gap: spacing['3xl'],
  },
  heading: { gap: spacing.sm },
  body: {
    paddingHorizontal: layout.gutter,
    marginTop: layout.searchOverlap,
    paddingBottom: spacing['5xl'],
    gap: spacing.xl,
  },
  panel: {
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: border.hairline,
    borderColor: colors.border,
  },
  // Alinhado com o conteúdo do painel (sm) ou com a coluna do formulário (md+).
  footer: { paddingHorizontal: spacing.xl, gap: spacing.xs },
  footerWide: { gap: spacing.xs },

  // md+
  split: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  brandPanel: {
    flex: 5,
    backgroundColor: colors.horizon,
    padding: spacing['6xl'],
    justifyContent: 'space-between',
  },
  brandCopy: { gap: spacing.md, maxWidth: layout.formMaxWidth },
  formPane: { flex: 7 },
  formScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['6xl'],
    paddingVertical: spacing['6xl'],
  },
  formColumn: { width: '100%', maxWidth: layout.formMaxWidth, gap: spacing['4xl'] },
  form: { gap: spacing.lg },
  prompt: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.xs },
}));

export interface AuthScaffoldProps {
  /** Título do ecrã (`hero`). */
  title: string;
  /** Uma frase concreta sobre o que o ecrã pede. */
  subtitle?: string;
  /** Campos, alertas e a ação primária. */
  children: ReactNode;
  /** Ações secundárias (links), por baixo do formulário. */
  footer?: ReactNode;
  testID?: string;
}

export function AuthScaffold({ title, subtitle, children, footer, testID }: AuthScaffoldProps) {
  const s = useStyles(factory);
  const { isWide } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const { layout } = useTheme();

  const heading = (
    <View style={s.heading}>
      <Text variant="hero" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color="text2">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  if (isWide) {
    return (
      <View testID={testID} style={s.split}>
        <View style={s.brandPanel}>
          <BrandLockup width={176} />
          <View style={s.brandCopy}>
            <Text variant="label" color="accentText">
              DIRETÓRIO DE EMPRESAS
            </Text>
            <Text variant="hero">Quem faz Cascais.</Text>
            <Text variant="body" color="text2">
              As empresas associadas da Associação Empresarial do Concelho de Cascais, com
              contactos, atividade e produtos num só sítio.
            </Text>
          </View>
        </View>
        <View style={s.formPane}>
          <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">
            <View style={s.formColumn}>
              {heading}
              <View style={s.form}>{children}</View>
              {footer ? <View style={s.footerWide}>{footer}</View> : null}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      testID={testID}
      style={s.screen}
      contentContainerStyle={s.scroll}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={[s.horizon, { paddingTop: insets.top + layout.gutter }]}>
        <BrandLockup width={132} />
        {heading}
      </View>
      <View style={s.body}>
        <Surface style={s.panel}>{children}</Surface>
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </View>
    </ScrollView>
  );
}

/** Pergunta + link numa linha (ex.: "Ainda não tens conta? Regista-te"). */
export function AuthPrompt({ prompt, ...link }: { prompt: string } & TextLinkProps) {
  const s = useStyles(factory);
  return (
    <View style={s.prompt}>
      <Text variant="body" color="text2">
        {prompt}
      </Text>
      <TextLink {...link} />
    </View>
  );
}
