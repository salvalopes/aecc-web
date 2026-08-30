import { useState } from 'react';
import { Text, TextInput, View, type KeyboardTypeOptions, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from './Icon';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | null;
  multiline?: boolean;
  numberOfLines?: number;
  required?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline = false,
  numberOfLines = 3,
  required = false,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize,
  autoFocus,
  style,
}: InputProps) {
  const { colors, radius, fontFamily, fontSize, fontWeight } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.error : focused ? colors.accentPrimary : colors.borderDefault;

  return (
    <View style={[{ gap: 6, marginBottom: 4 }, style]}>
      {label && (
        <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary }}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : undefined}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          fontFamily: fontFamily.body,
          // Must stay >= 16px: Safari iOS auto-zooms the page on focus of any
          // <input>/<textarea>/<select> with a computed font-size below that.
          fontSize: fontSize.md,
          color: colors.textPrimary,
          backgroundColor: colors.surfaceSunken,
          borderWidth: 1,
          borderColor,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 10,
          minHeight: multiline ? 80 : 44,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
      {error && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="warning-circle" size={14} color={colors.error} />
          <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.error }}>{error}</Text>
        </View>
      )}
    </View>
  );
}
