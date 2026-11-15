import { Platform, Switch as RNSwitch } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Interruptor do sistema com as cores dos tokens: trilho `accent` ligado e `text3` desligado.
 * No nativo o botão fica com a cor do sistema. No web, o react-native-web pinta-o de verde-azulado
 * por omissão; passa a `logoPlate`, o quase-branco dos dois esquemas (como o botão do iOS).
 */
export function Switch({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
  testID,
}: SwitchProps) {
  const { colors } = useTheme();
  return (
    <RNSwitch
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.text3, true: colors.accent }}
      ios_backgroundColor={colors.text3}
      {...(Platform.OS === 'web'
        ? ({ thumbColor: colors.logoPlate, activeThumbColor: colors.logoPlate } as object)
        : null)}
    />
  );
}
