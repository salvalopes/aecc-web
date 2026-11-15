import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from './Text';
import { Button } from './Button';

const factory = createStyles(({ colors, layout }) => ({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.gutter,
    backgroundColor: colors.bg,
  },
  body: { maxWidth: 360, alignItems: 'center', gap: 8 },
  center: { textAlign: 'center' },
}));

export interface StateScreenProps {
  /** Sessão a carregar (sem ícone nem ação). */
  loading?: boolean;
  icon?: IconName;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
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
      {loading ? (
        <ActivityIndicator color={colors.text2} accessibilityLabel="A carregar" />
      ) : (
        <View style={s.body}>
          {icon ? <Icon name={icon} size={size.icon.xl} color={colors.text3} /> : null}
          {title ? (
            <Text variant="title" style={s.center}>
              {title}
            </Text>
          ) : null}
          {description ? (
            <Text variant="body" color="text2" style={s.center}>
              {description}
            </Text>
          ) : null}
          {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
        </View>
      )}
    </View>
  );
}
