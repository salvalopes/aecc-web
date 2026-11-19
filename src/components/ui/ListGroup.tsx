import { Pressable, View, type PressableStateCallbackType, type ViewProps } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon } from './Icon';
import { Surface } from './Surface';

const groupFactory = createStyles(({ colors, border }) => ({
  group: { borderWidth: border.hairline, borderColor: colors.border },
}));

/** Grupo de linhas sobre superfície sólida (raio `group`, hairline exterior). */
export function ListGroup({ children, style, ...rest }: ViewProps) {
  const s = useStyles(groupFactory);
  return (
    <Surface {...rest} style={[s.group, style]}>
      {children}
    </Surface>
  );
}

const factory = createStyles(({ colors, border, size, spacing }) => ({
  row: {
    minHeight: size.row.mobile,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  compact: { minHeight: size.row.web, paddingVertical: spacing.sm },
  // Lista de escolha de uma linha (ex.: categorias do mapa): o mínimo do alvo de toque.
  dense: { minHeight: size.hitTarget, paddingVertical: spacing.xs },
  // hairline indentada: começa depois do plate (16 + 48 + 12)
  rule: {
    position: 'absolute',
    bottom: spacing[0],
    right: spacing[0],
    left: spacing.lg + size.plate.md + spacing.md,
    height: border.hairline,
    backgroundColor: colors.border,
  },
  // …depois de um ícone (16 + 20 + 12) ou alinhada com o texto, sem nada à esquerda (16)
  ruleIcon: { left: spacing.lg + size.icon.md + spacing.md },
  ruleText: { left: spacing.lg },
}));

export interface ListRowProps extends ViewProps {
  onPress?: () => void;
  /** Última linha do grupo: sem hairline. */
  last?: boolean;
  chevron?: boolean;
  /**
   * `regular`: 72 (mobile); `compact`: 64 (web `md+`); `dense`: 44 (= alvo de toque), para listas
   * de escolha de uma linha só (ex.: as categorias no painel do mapa).
   */
  density?: 'regular' | 'compact' | 'dense';
  /** Onde começa a hairline: depois do `plate` (omissão), de um `icon` ou do início do `text`. */
  inset?: 'plate' | 'icon' | 'text';
  /**
   * Linha de uma escolha única (ex.: as categorias do mapa): papel `radio` com `aria-checked`, que o
   * nativo e o react-native-web expõem aos leitores de ecrã. Sem isto, é um botão.
   */
  choice?: { checked: boolean };
}

// O RNW passa `hovered` ao callback de estilo; no nativo não existe (hover só no web).
const isHovered = (state: PressableStateCallbackType) =>
  !!(state as PressableStateCallbackType & { hovered?: boolean }).hovered;

export function ListRow({
  onPress,
  last,
  chevron,
  density = 'regular',
  inset = 'plate',
  choice,
  children,
  style,
  ...rest
}: ListRowProps) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  const body = (
    <>
      {children}
      {chevron ? <Icon name="caret-right" size={size.icon.sm} color={colors.text3} /> : null}
      {last ? null : (
        <View
          pointerEvents="none"
          style={[s.rule, inset === 'icon' ? s.ruleIcon : inset === 'text' ? s.ruleText : null]}
        />
      )}
    </>
  );
  const base = [s.row, density === 'regular' ? null : s[density]];
  if (!onPress) {
    return (
      <View {...rest} style={[...base, style]}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={rest.testID}
      accessibilityRole={choice ? 'radio' : 'button'}
      accessibilityLabel={rest.accessibilityLabel}
      aria-checked={choice ? choice.checked : undefined}
      onPress={onPress}
      style={(state) => [
        ...base,
        state.pressed || isHovered(state) ? { backgroundColor: colors.raised } : null,
        style,
      ]}
    >
      {body}
    </Pressable>
  );
}
