import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { geist, inputMin } from '@/theme/typography';
import { Text } from './Text';

const factory = createStyles(({ colors, radius, opacity, spacing, size, border }) => ({
  wrap: { gap: spacing.sm },
  input: {
    minHeight: size.control.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    borderWidth: border.default,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: geist.regular,
    fontSize: inputMin,
  },
  // Texto corrido (descrições): 4 linhas visíveis, a escrever a partir do topo.
  multiline: {
    minHeight: spacing['6xl'] * 2,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
  disabled: { opacity: opacity.disabled },
}));

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string | null;
  /** Marca o campo como opcional no rótulo (os obrigatórios não levam marca). */
  optional?: boolean;
}

/**
 * Label por cima, erro por baixo (D2). Mínimo de 16px para evitar o zoom do Safari iOS.
 * O erro herda o `testID` do campo com o sufixo `-error` (ex.: `login.email-error`).
 */
export function TextField({
  label,
  hint,
  error,
  editable = true,
  optional = false,
  multiline,
  onFocus,
  onBlur,
  testID,
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
        {optional ? (
          <Text variant="meta" color="text3">
            {' · opcional'}
          </Text>
        ) : null}
      </Text>
      <TextInput
        {...rest}
        multiline={multiline}
        testID={testID}
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
        style={[
          s.input,
          multiline ? s.multiline : null,
          { borderColor },
          editable ? null : s.disabled,
        ]}
      />
      {error ? (
        <Text
          testID={testID ? `${testID}-error` : undefined}
          variant="meta"
          color="error"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text variant="meta">{hint}</Text>
      ) : null}
    </View>
  );
}
