import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon, type IconName } from '@/components/ui/Icon';

const factory = createStyles(({ size, radii, opacity }) => ({
  base: {
    width: size.hitTarget,
    height: size.hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control,
    borderCurve: 'continuous',
  },
  contact: { borderRadius: radii.capsule },
  disabled: { opacity: opacity.disabled },
}));

export interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress?: () => void;
  /** `contact`: círculo sobre `raised` (telefone, email, site). */
  variant?: 'plain' | 'contact';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function IconButton({
  icon,
  label,
  onPress,
  variant = 'plain',
  disabled,
  style,
  testID,
}: IconButtonProps) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  const contact = variant === 'contact';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.base,
        contact ? s.contact : null,
        { backgroundColor: pressed || contact ? colors.raised : 'transparent' },
        disabled ? s.disabled : null,
        style,
      ]}
    >
      <Icon name={icon} size={size.icon.md} color={contact ? colors.accentText : colors.text} />
    </Pressable>
  );
}
