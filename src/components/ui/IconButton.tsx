import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Icon, type IconName } from './Icon';

type Tone = 'default' | 'danger' | 'accent';

interface IconButtonProps {
  icon: IconName;
  label: string;
  tone?: Tone;
  size?: number;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, label, tone = 'default', size = 20, disabled = false, onPress, style }: IconButtonProps) {
  const { colors, radius, hitTargetMin } = useTheme();
  const color = tone === 'danger' ? colors.error : tone === 'accent' ? colors.accentPrimary : colors.textSecondary;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: hitTargetMin,
          minHeight: hitTargetMin,
          paddingHorizontal: 10,
          borderRadius: radius.md,
          backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}
