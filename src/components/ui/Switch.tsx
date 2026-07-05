import { Switch as RNSwitch } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function Switch({ value, onValueChange, disabled = false }: SwitchProps) {
  const { colors } = useTheme();
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.borderDefault, true: colors.accentPrimary }}
      thumbColor="#ffffff"
    />
  );
}
