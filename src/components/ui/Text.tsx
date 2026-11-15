import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { tabular, type TextVariant } from '@/theme/typography';

type TextColor = 'text' | 'text2' | 'text3' | 'accentText' | 'onAccent' | 'error' | 'success';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  /** Por omissão: `text2` em `meta`/`label`, `text` nos restantes. */
  color?: TextColor;
  tabular?: boolean;
}

export function Text({ variant = 'body', color, tabular: tab, style, ...rest }: TextProps) {
  const { colors, textStyles } = useTheme();
  const role = color ?? (variant === 'meta' || variant === 'label' ? 'text2' : 'text');
  return (
    <RNText
      {...rest}
      style={[textStyles[variant], { color: colors[role] }, tab ? tabular : null, style]}
    />
  );
}
