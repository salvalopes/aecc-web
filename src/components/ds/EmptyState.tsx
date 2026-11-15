import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from './Text';
import { Button } from './Button';

const factory = createStyles(() => ({
  wrap: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  icon: { marginBottom: 8 },
  center: { textAlign: 'center' },
}));

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  /** Instruções concretas: o que fazer a seguir. */
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({
  icon = 'magnifying-glass',
  title,
  description,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  return (
    <View testID={testID} style={s.wrap}>
      <View style={s.icon}>
        <Icon name={icon} size={size.icon.xl} color={colors.text3} />
      </View>
      <Text variant="heading" style={s.center}>
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="text2" style={s.center}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" size="sm" onPress={onAction} />
      ) : null}
    </View>
  );
}
