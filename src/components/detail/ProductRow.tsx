import { Image, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon } from '@/components/ui/Icon';
import { ListRow, Text } from '@/components/ui';
import type { Product } from '@/types/api';

const factory = createStyles(({ colors, size, radius, spacing }) => ({
  thumb: {
    width: size.plate.md,
    height: size.plate.md,
    borderRadius: radius.plate,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  image: { width: size.plate.md, height: size.plate.md },
  text: { flex: 1, minWidth: spacing[0], gap: spacing['2xs'] },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.xs },
}));

export const productTypeLabel = (p: Pick<Product, 'type'>) =>
  p.type === 'Product' ? 'Produto' : 'Serviço';

/** Miniatura do produto com a geometria do `Plate` (48): imagem ou ícone do tipo. */
export function ProductThumb({ product }: { product: Pick<Product, 'type' | 'imageUrl'> }) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  return (
    <View accessible={false} style={s.thumb}>
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={s.image} resizeMode="cover" />
      ) : (
        <Icon
          name={product.type === 'Product' ? 'basket' : 'briefcase'}
          size={size.icon.lg}
          color={colors.accentSoftText}
        />
      )}
    </View>
  );
}

/** Linha de produto/serviço na lista da empresa (T4): miniatura, nome, tipo e benefício. */
export function ProductRow({
  product,
  onPress,
  last,
  density,
}: {
  product: Product;
  onPress: () => void;
  last?: boolean;
  density?: 'regular' | 'compact';
}) {
  const s = useStyles(factory);
  const type = productTypeLabel(product);
  return (
    <ListRow
      testID="company-detail.product"
      onPress={onPress}
      last={last}
      chevron
      density={density}
      accessibilityLabel={
        product.hasMemberBenefit
          ? `${product.name}, ${type}, com benefício para membros`
          : `${product.name}, ${type}`
      }
    >
      <ProductThumb product={product} />
      <View style={s.text}>
        <Text variant="name" numberOfLines={2}>
          {product.name}
        </Text>
        <View style={s.meta}>
          <Text variant="meta">{type}</Text>
          {product.hasMemberBenefit ? (
            <>
              <Text variant="meta" color="text3">
                ·
              </Text>
              <Text variant="meta" color="accentText">
                Benefício para membros
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </ListRow>
  );
}
