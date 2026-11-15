import { useState } from 'react';
import { Platform, Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { geist, inputMin } from '@/theme/typography';
import { Icon } from '@/components/ui/Icon';
import { glassStyle } from '../ui/GlassSurface';

const factory = createStyles(({ colors, radii, size, border }) => ({
  wrap: {
    height: size.search,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 18,
    borderRadius: radii.capsule,
    borderCurve: 'continuous',
  },
  input: {
    flex: 1,
    height: '100%',
    color: colors.text,
    fontFamily: geist.regular,
    fontSize: inputMin,
  },
  // Anel de foco à volta da cápsula (não do <input>): 2px `focusRing`, por fora do hairline.
  ring: {
    position: 'absolute',
    top: -border.default,
    right: -border.default,
    bottom: -border.default,
    left: -border.default,
    borderRadius: radii.capsule,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: colors.focusRing,
  },
  // web: o anel é o da cápsula; sem o outline por omissão do browser no <input>.
  noOutline: Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {},
  clear: {
    width: size.hitTarget,
    height: size.hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

export interface SearchFieldProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (v: string) => void;
}

/** Cápsula de vidro de 52px com botão de limpar (D3). */
export function SearchField({ value, onChangeText, onFocus, onBlur, ...rest }: SearchFieldProps) {
  const s = useStyles(factory);
  const { colors, material, size } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.wrap, glassStyle(material)]}>
      <Icon name="magnifying-glass" size={size.icon.md} color={colors.text2} />
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={rest.placeholder ?? 'Pesquisar'}
        placeholderTextColor={colors.text3}
        returnKeyType="search"
        selectionColor={colors.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[s.input, s.noOutline]}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpar pesquisa"
          onPress={() => onChangeText('')}
          style={s.clear}
        >
          <Icon name="x" size={size.icon.sm} color={colors.text2} />
        </Pressable>
      ) : null}
      {focused ? <View pointerEvents="none" style={s.ring} /> : null}
    </View>
  );
}
