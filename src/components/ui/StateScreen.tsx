import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { Button } from './Button';

const factory = createStyles(({ colors, layout, spacing }) => ({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.gutter,
    backgroundColor: colors.bg,
  },
  body: { width: '100%', maxWidth: layout.formMaxWidth, alignItems: 'center', gap: spacing.sm },
  center: { textAlign: 'center' },
  action: { marginTop: spacing.lg, alignSelf: 'stretch' },
}));

export interface StateScreenProps {
  /** Indicador de progresso no lugar do ícone (sessão a carregar, callback). */
  loading?: boolean;
  icon?: IconName;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** O botão da ação recebe `<testID>.action`. */
  testID?: string;
}

/** Ecrã inteiro de estado (T2): callback, não encontrado, sem permissão, sessão a carregar. */
export function StateScreen({
  loading,
  icon,
  title,
  description,
  actionLabel,
  onAction,
  testID,
}: StateScreenProps) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  return (
    <View testID={testID} style={s.screen}>
      <View style={s.body} accessibilityLiveRegion="polite">
        {loading ? (
          <ActivityIndicator
            color={colors.text2}
            accessibilityLabel={title ? undefined : 'A carregar'}
          />
        ) : icon ? (
          <Icon name={icon} size={size.icon.xl} color={colors.text3} />
        ) : null}
        {title ? (
          <Text variant="title" accessibilityRole="header" style={s.center}>
            {title}
          </Text>
        ) : null}
        {description ? (
          <Text variant="body" color="text2" style={s.center}>
            {description}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <View style={s.action}>
            <Button
              label={actionLabel}
              onPress={onAction}
              testID={testID ? `${testID}.action` : undefined}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}
