import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from './Text';
import { Button, type ButtonProps } from './Button';

const factory = createStyles(({ spacing, layout }) => ({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['5xl'],
    paddingHorizontal: spacing['2xl'],
  },
  // Dentro de um grupo de lista: alinhado à esquerda com o conteúdo das linhas.
  start: {
    alignItems: 'flex-start',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  icon: { marginBottom: spacing.sm },
  center: { textAlign: 'center' },
  measure: { maxWidth: layout.formMaxWidth + spacing['5xl'] },
  action: { marginTop: spacing.sm },
}));

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  /** Instruções concretas: o que fazer a seguir. */
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Por omissão `secondary`; `glass` sobre o grupo da lista (Maré). */
  actionVariant?: Extract<ButtonProps['variant'], 'secondary' | 'glass'>;
  /** `start` dentro de um `ListGroup`; `center` em ecrã/painel próprio. */
  align?: 'center' | 'start';
  testID?: string;
}

export function EmptyState({
  icon = 'magnifying-glass',
  title,
  description,
  actionLabel,
  onAction,
  actionVariant = 'secondary',
  align = 'center',
  testID,
}: EmptyStateProps) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  const centered = align === 'center';
  const textStyle = [s.measure, centered ? s.center : null];
  return (
    <View testID={testID} style={[s.wrap, centered ? null : s.start]}>
      <View style={s.icon}>
        <Icon name={icon} size={size.icon.xl} color={colors.text3} />
      </View>
      <Text variant="heading" style={textStyle}>
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="text2" style={textStyle}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant={actionVariant}
          size="sm"
          onPress={onAction}
          style={s.action}
        />
      ) : null}
    </View>
  );
}
