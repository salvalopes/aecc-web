import { Text as RNText } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { geist } from '@/theme/typography';
import { Text, type TextProps } from './Text';
import { splitByTerm } from '@/utils/text';

/** Texto com o termo pesquisado realçado (sem acentos nem maiúsculas). */
export function Highlight({
  text,
  query,
  ...rest
}: Omit<TextProps, 'children'> & { text: string; query: string }) {
  const { colors } = useTheme();
  return (
    <Text {...rest}>
      {splitByTerm(text, query).map((p, i) =>
        p.hit ? (
          <RNText
            key={i}
            style={{
              backgroundColor: colors.accentSoft,
              color: colors.accentSoftText,
              fontFamily: geist.semibold,
            }}
          >
            {p.text}
          </RNText>
        ) : (
          p.text
        ),
      )}
    </Text>
  );
}
