import { Image, Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import type { ProductImage } from '@/types/api';
import { Icon } from '@/components/ui/Icon';
import { Button, IconButton, InlineAlert, Text } from '@/components/ui';
import { FormSection } from '@/components/templates/FormLayout';

/** Limite da API por produto. */
export const MAX_PRODUCT_IMAGES = 15;

// Galeria no "Editar produto" (T7, B12). Ao contrário dos campos, cada ação grava logo
// (adicionar, destacar, apagar), e a secção di-lo. Grelha de miniaturas `size.plate.lg`:
// a destacada tem a barra `accent` e a estrela; as outras, "Destacar". Tocar abre o lightbox.
const factory = createStyles(({ colors, spacing, size, radius, border }) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { width: size.plate.lg, gap: spacing.xs },
  thumb: {
    width: size.plate.lg,
    height: size.plate.lg,
    borderRadius: radius.plate,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: border.accentBar,
    // Reserva o espaço da barra; sobre `raised` não se vê (o fundo passa por baixo da borda).
    borderColor: colors.raised,
    backgroundColor: colors.raised,
  },
  thumbFeatured: { borderColor: colors.accent },
  image: { width: '100%', height: '100%' },
  star: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    width: size.icon.lg,
    height: size.icon.lg,
    borderRadius: radius.capsule,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionsEnd: { justifyContent: 'flex-end' },
  add: { alignSelf: 'flex-start' },
}));

export interface ImageManagerProps {
  images: ProductImage[];
  error?: string | null;
  uploading?: boolean;
  deletingId?: string | null;
  onAdd: () => void;
  onFeature: (image: ProductImage) => void;
  onDelete: (image: ProductImage) => void;
  onOpen: (index: number) => void;
}

export function ImageManager({
  images,
  error,
  uploading = false,
  deletingId,
  onAdd,
  onFeature,
  onDelete,
  onOpen,
}: ImageManagerProps) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  const full = images.length >= MAX_PRODUCT_IMAGES;
  return (
    <FormSection
      label={`IMAGENS · ${images.length} DE ${MAX_PRODUCT_IMAGES}`}
      description="As alterações às imagens ficam gravadas logo. A imagem em destaque abre a galeria e aparece nas listas."
      testID="product-edit.gallery"
    >
      {error ? (
        <InlineAlert tone="error" message={error} testID="product-edit.gallery-error" />
      ) : null}
      {images.length > 0 ? (
        <View style={s.grid}>
          {images.map((img, index) => (
            <View key={img.id} style={s.tile} testID="product-edit.image">
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityLabel={`Ver a imagem ${index + 1}${img.isFeatured ? ', em destaque' : ''}`}
                onPress={() => onOpen(index)}
                style={[s.thumb, img.isFeatured ? s.thumbFeatured : null]}
              >
                <Image source={{ uri: img.imageUrl }} style={s.image} resizeMode="cover" />
                {img.isFeatured ? (
                  <View style={s.star}>
                    <Icon name="star" size={size.icon.sm} color={colors.onAccent} />
                  </View>
                ) : null}
              </Pressable>
              <View style={[s.actions, img.isFeatured ? s.actionsEnd : null]}>
                {img.isFeatured ? null : (
                  <IconButton
                    testID="product-edit.image-feature"
                    icon="star"
                    label={`Destacar a imagem ${index + 1}`}
                    onPress={() => onFeature(img)}
                  />
                )}
                <IconButton
                  testID="product-edit.image-delete"
                  icon="trash"
                  label={`Apagar a imagem ${index + 1}`}
                  disabled={deletingId === img.id}
                  onPress={() => onDelete(img)}
                />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="meta">Ainda sem imagens.</Text>
      )}
      <Button
        testID="product-edit.image-add"
        label={full ? `Máximo de ${MAX_PRODUCT_IMAGES} imagens` : 'Adicionar imagem'}
        variant="secondary"
        size="sm"
        loading={uploading}
        disabled={uploading || full}
        onPress={onAdd}
        style={s.add}
      />
    </FormSection>
  );
}
