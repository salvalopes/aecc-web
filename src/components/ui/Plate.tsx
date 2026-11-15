import { Image, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { geist } from '@/theme/typography';
import { Text } from './Text';
import { initials } from '@/utils/text';

export interface PlateProps {
  company: { name: string; tradeName: string | null; logoUrl: string | null };
  size?: 'sm' | 'md' | 'lg';
}

/** Logo sobre `logoPlate` ou, sem logo, iniciais sobre `accentSoft`. */
export function Plate({ company, size = 'md' }: PlateProps) {
  const { colors, size: sizes, radius, border } = useTheme();
  const px = sizes.plate[size];
  const logo = company.logoUrl;
  return (
    <View
      accessible={false}
      style={{
        width: px,
        height: px,
        borderRadius: size === 'lg' ? radius.group : radius.plate,
        borderCurve: 'continuous',
        backgroundColor: logo ? colors.logoPlate : colors.accentSoft,
        borderWidth: logo ? border.default : 0,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {logo ? (
        <Image
          source={{ uri: logo }}
          style={{ width: Math.round(px * 0.7), height: Math.round(px * 0.7) }}
          resizeMode="contain"
        />
      ) : (
        <Text
          style={{
            fontFamily: geist.bold,
            fontSize: Math.round(px * 0.34),
            color: colors.accentSoftText,
            letterSpacing: 0.2,
          }}
        >
          {initials(company)}
        </Text>
      )}
    </View>
  );
}
