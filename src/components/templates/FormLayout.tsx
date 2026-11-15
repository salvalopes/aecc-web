import { useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import { useBreakpoint } from '@/theme/useBreakpoint';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { Button, InlineAlert, ListGroup, ListRow, Skeleton, Switch, Text } from '@/components/ui';

// T7 Formulário em ecrã (fase3-plano §4.1 e §4.2 #24), direção Maré. Substitui o `Modal`.
// Ecrã empurrado no `Stack` de `(app)`, por cima das tabs: o header dá o título e o "voltar".
// sm: secções em coluna (rótulo por cima dos campos). md+: cada secção numa linha, rótulo e
// explicação à esquerda (1fr) e campos à direita (2fr), numa página de `layout.formPageMax`.
// O rodapé com Cancelar/Guardar fica fixo por baixo do scroll e sobe com o teclado (iOS: KeyboardAvoidingView; Android: `useKeyboardInset`).
const factory = createStyles(({ colors, spacing, layout, border }) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  page: {
    width: '100%',
    maxWidth: layout.formPageMax,
    alignSelf: 'center',
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.xl,
    paddingBottom: spacing['5xl'],
    gap: layout.sectionGap,
  },
  pageWide: {
    paddingHorizontal: layout.gutterWide,
    paddingTop: spacing['4xl'],
    gap: spacing['5xl'],
  },
  footer: {
    borderTopWidth: border.hairline,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingTop: spacing.md,
  },
  footerInner: {
    width: '100%',
    maxWidth: layout.formPageMax,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: layout.gutter,
  },
  footerInnerWide: { justifyContent: 'flex-end', paddingHorizontal: layout.gutterWide },
  footerButton: { flex: 1 },
  section: { gap: spacing.lg },
  sectionWide: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['4xl'] },
  sectionHead: { gap: spacing.xs },
  sectionHeadWide: { flex: 1, minWidth: spacing[0] },
  sectionBody: { gap: spacing.xl },
  sectionBodyWide: { flex: 2, minWidth: spacing[0] },
  field: { gap: spacing.sm },
  switchText: { flex: 1, minWidth: spacing[0], gap: spacing['2xs'] },
  skeletonField: { gap: spacing.sm },
}));

export interface FormLayoutProps {
  children: ReactNode;
  onSubmit: () => void;
  onCancel: () => void;
  /** Prefixo dos `testID`: `<prefixo>.screen`, `.save`, `.cancel`, `.form-error`, `.loading`. */
  testIDPrefix: string;
  submitLabel?: string;
  submitting?: boolean;
  /** Erro do formulário inteiro (API, rede). Os erros de campo vão no `TextField`. */
  error?: string | null;
  /** Dados a carregar (editar): esqueleto dos campos e Guardar bloqueado. */
  loading?: boolean;
}

export function FormLayout({
  children,
  onSubmit,
  onCancel,
  testIDPrefix,
  submitLabel = 'Guardar',
  submitting = false,
  error,
  loading = false,
}: FormLayoutProps) {
  const s = useStyles(factory);
  const { spacing } = useTheme();
  const { isWide } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  // O header do `Stack` fica por cima: o `KeyboardAvoidingView` precisa de saber onde começa
  // na janela para o rodapé subir exatamente até ao teclado (sem `useHeaderHeight`).
  const frame = useRef<View>(null);
  const [top, setTop] = useState(0);

  return (
    <View
      ref={frame}
      testID={`${testIDPrefix}.screen`}
      style={s.screen}
      onLayout={() => frame.current?.measureInWindow((_x, y) => setTop(y))}
    >
      <KeyboardAvoidingView
        style={[s.fill, { paddingBottom: keyboard }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={top}
      >
        <ScrollView
          style={s.fill}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View style={[s.page, isWide ? s.pageWide : null]}>
            {error ? (
              <InlineAlert tone="error" message={error} testID={`${testIDPrefix}.form-error`} />
            ) : null}
            {loading ? <FormSkeleton testID={`${testIDPrefix}.loading`} /> : children}
          </View>
        </ScrollView>
        <View
          style={[
            s.footer,
            { paddingBottom: keyboard > 0 ? spacing.md : Math.max(insets.bottom, spacing.md) },
          ]}
        >
          <View style={[s.footerInner, isWide ? s.footerInnerWide : null]}>
            <Button
              testID={`${testIDPrefix}.cancel`}
              label="Cancelar"
              variant="secondary"
              onPress={onCancel}
              style={isWide ? null : s.footerButton}
            />
            <Button
              testID={`${testIDPrefix}.save`}
              label={submitLabel}
              loading={submitting}
              disabled={loading}
              onPress={onSubmit}
              style={isWide ? null : s.footerButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Secção: rótulo (`label`, maiúsculas), explicação opcional e os campos. */
export function FormSection({
  label,
  description,
  children,
  testID,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  testID?: string;
}) {
  const s = useStyles(factory);
  const { isWide } = useBreakpoint();
  return (
    <View testID={testID} style={[s.section, isWide ? s.sectionWide : null]}>
      <View style={[s.sectionHead, isWide ? s.sectionHeadWide : null]}>
        <Text variant="label" accessibilityRole="header">
          {label}
        </Text>
        {description ? <Text variant="meta">{description}</Text> : null}
      </View>
      <View style={[s.sectionBody, isWide ? s.sectionBodyWide : null]}>{children}</View>
    </View>
  );
}

/**
 * Campo que não é texto (tipo, papel, categoria, logo): o mesmo rótulo, ajuda e erro do
 * `TextField`, à volta de um controlo qualquer. O erro herda o `testID` com `-error`.
 */
export function FormField({
  label,
  hint,
  error,
  optional,
  children,
  testID,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  children: ReactNode;
  testID?: string;
}) {
  const s = useStyles(factory);
  return (
    <View testID={testID} style={s.field}>
      <Text variant="meta" color="text">
        {label}
        {optional ? (
          <Text variant="meta" color="text3">
            {' · opcional'}
          </Text>
        ) : null}
      </Text>
      {children}
      {error ? (
        <Text
          testID={testID ? `${testID}-error` : undefined}
          variant="meta"
          color="error"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text variant="meta">{hint}</Text>
      ) : null}
    </View>
  );
}

/** Opção ligada/desligada numa linha agrupada: rótulo e explicação à esquerda, `Switch` à direita. */
export function FormSwitch({
  label,
  description,
  value,
  onValueChange,
  disabled,
  testID,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}) {
  const s = useStyles(factory);
  return (
    <ListGroup>
      <ListRow last inset="text" density="compact">
        <View style={s.switchText}>
          <Text variant="name">{label}</Text>
          {description ? <Text variant="meta">{description}</Text> : null}
        </View>
        <Switch
          testID={testID}
          accessibilityLabel={label}
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
        />
      </ListRow>
    </ListGroup>
  );
}

function FormSkeleton({ testID }: { testID: string }) {
  const s = useStyles(factory);
  const { spacing } = useTheme();
  const { isWide } = useBreakpoint();
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={s.sectionBody}
    >
      {[0, 1].map((section) => (
        <View key={section} style={[s.section, isWide ? s.sectionWide : null]}>
          <View style={[s.sectionHead, isWide ? s.sectionHeadWide : null]}>
            <Skeleton width="40%" />
          </View>
          <View style={[s.sectionBody, isWide ? s.sectionBodyWide : null]}>
            {[0, 1].map((field) => (
              <View key={field} style={s.skeletonField}>
                <Skeleton width={field === 0 ? '28%' : '36%'} />
                <Skeleton width="100%" height={spacing['6xl']} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
