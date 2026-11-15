import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui';
import type { ProductImage } from '@/types/api';

const factory = createStyles(({ colors, radius, spacing, border, size }) => ({
  wrap: { gap: spacing.md },
  main: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.group,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.raised,
  },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.capsule,
    backgroundColor: colors.accent,
  },
  thumbs: { gap: spacing.sm },
  thumb: {
    width: size.thumb,
    height: size.thumb,
    borderRadius: radius.plate,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: border.accentBar,
    // Reserva o espaço da barra; sobre `raised` não se vê (o fundo passa por baixo da borda).
    borderColor: colors.raised,
    backgroundColor: colors.raised,
  },
  thumbActive: { borderColor: colors.accent },
  // Placeholder do `md+` sem imagens: mantém a geometria da coluna da galeria.
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
}));

/** Destaque sobre a imagem: cápsula `accent` com o texto em `onAccent`. */
export function FeaturedBadge() {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  return (
    <View style={s.badge}>
      <Icon name="star" size={size.icon.sm} color={colors.onAccent} />
      <Text variant="label" color="onAccent">
        Destaque
      </Text>
    </View>
  );
}

/** Galeria do produto (T4): imagem principal 4:3 e miniaturas. Tocar na principal abre o lightbox. */
export function ProductGallery({
  images,
  onOpen,
}: {
  images: ProductImage[];
  onOpen: (index: number) => void;
}) {
  const s = useStyles(factory);
  const featured = Math.max(
    0,
    images.findIndex((i) => i.isFeatured),
  );
  const [active, setActive] = useState(featured);

  // As imagens mudam (apagar, destacar) a partir do formulário: o índice tem de continuar válido.
  useEffect(() => {
    setActive((i) => (i < images.length ? i : featured));
  }, [images.length, featured]);

  const current = images[active] ?? images[0];
  if (!current) return null;

  return (
    <View style={s.wrap} testID="product-detail.gallery">
      <Pressable
        testID="product-detail.gallery-main"
        accessibilityRole="imagebutton"
        accessibilityLabel={`Ver imagem ${active + 1} de ${images.length} em ecrã inteiro`}
        onPress={() => onOpen(active)}
        style={s.main}
      >
        <Image source={{ uri: current.imageUrl }} style={s.image} resizeMode="cover" />
        {current.isFeatured ? <FeaturedBadge /> : null}
      </Pressable>
      {images.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.thumbs}
        >
          {images.map((img, index) => (
            <Pressable
              key={img.id}
              accessibilityRole="button"
              accessibilityLabel={`Mostrar a imagem ${index + 1}`}
              accessibilityState={{ selected: index === active }}
              onPress={() => setActive(index)}
              style={[s.thumb, index === active ? s.thumbActive : null]}
            >
              <Image source={{ uri: img.imageUrl }} style={s.image} resizeMode="cover" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

/** `md+` sem imagens: a coluna da galeria fica com um painel do tipo, para não desequilibrar. */
export function GalleryPlaceholder({ service }: { service: boolean }) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  return (
    <View style={[s.main, s.empty]} accessibilityElementsHidden importantForAccessibility="no">
      <Icon name={service ? 'briefcase' : 'basket'} size={size.icon.xl} color={colors.text3} />
      <Text variant="meta" color="text3">
        Sem imagens
      </Text>
    </View>
  );
}
