import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { geist, inputMin } from '@/theme/typography';
import { Icon } from '@/components/ui/Icon';
import { glassStyle } from '../ui/GlassSurface';

const factory = createStyles(({ colors, radii, size }) => ({
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
export function SearchField({ value, onChangeText, ...rest }: SearchFieldProps) {
  const s = useStyles(factory);
  const { colors, material, size } = useTheme();
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
        style={s.input}
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
    </View>
  );
}
