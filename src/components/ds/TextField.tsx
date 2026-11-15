import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { geist, inputMin } from '@/theme/typography';
import { Text } from './Text';

const factory = createStyles(({ colors, radii, opacity }) => ({
  wrap: { gap: 8 },
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radii.control,
    borderCurve: 'continuous',
    borderWidth: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: geist.regular,
    fontSize: inputMin,
  },
  disabled: { opacity: opacity.disabled },
}));

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string | null;
}

/** Label por cima, erro por baixo (D2). Mínimo de 16px para evitar o zoom do Safari iOS. */
export function TextField({
  label,
  hint,
  error,
  editable = true,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const s = useStyles(factory);
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.error : focused ? colors.focusRing : colors.border;
  return (
    <View style={s.wrap}>
      <Text variant="meta" color="text">
        {label}
      </Text>
      <TextInput
        {...rest}
        editable={editable}
        accessibilityLabel={label}
        placeholderTextColor={colors.text3}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[s.input, { borderColor }, editable ? null : s.disabled]}
      />
      {error ? (
        <Text variant="meta" color="error" accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="meta">{hint}</Text>
      ) : null}
    </View>
  );
}
