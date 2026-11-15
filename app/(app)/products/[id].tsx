import { Image, Pressable, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
import { useEffect, useState, startTransition } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useBreakpoint } from '@/theme/useBreakpoint';
// Formulário de edição: continua no `Modal` até à B12 (T7).
import { Icon, Button as LegacyButton, Input, Switch, Chip, Modal } from '@/components/ui';
import {
  Button,
  CompanyRow,
  ErrorState,
  InlineAlert,
  ListGroup,
  Skeleton,
  StateScreen,
  Text,
} from '@/components/ds';
import { DetailScaffold, DetailSection } from '@/components/templates/DetailScaffold';
import { InfoGroup } from '@/components/detail/InfoGroup';
import { GalleryPlaceholder, ProductGallery } from '@/components/detail/ProductGallery';
import { productTypeLabel } from '@/components/detail/ProductRow';
import { productsApi } from '@/api/products.api';
import { companiesApi } from '@/api/companies.api';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import { confirmDestructive } from '@/utils/confirm';
import { ImageLightbox } from '@/components/ImageLightbox';
import type {
  Product,
  ProductImage,
  Company,
  Category,
  UpdateProductRequest,
  ProductType,
} from '@/types/api';

interface FormState {
  categoryId: string;
  type: ProductType;
  name: string;
  description: string;
  hasMemberBenefit: boolean;
  memberBenefitDescription: string;
}

// T4 Detalhe do produto (B11). sm: galeria (se houver imagens) e depois a informação.
// md+: galeria à esquerda (3fr, fixa no web) e informação à direita (2fr). As ações do dono
// saíram do header do `Stack` para junto do título.
const factory = createStyles(({ colors, spacing, radii }) => ({
  identity: { gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  benefit: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.group,
    borderCurve: 'continuous',
    backgroundColor: colors.accentSoft,
  },
  benefitHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  benefitText: { color: colors.accentSoftText },
  mediaSkeleton: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radii.group,
    borderCurve: 'continuous',
    backgroundColor: colors.raised,
  },
  skeletonText: { gap: spacing.sm },
}));

function ProductDetailSkeleton() {
  const s = useStyles(factory);
  const { spacing } = useTheme();
  return (
    <DetailScaffold
      testID="product-detail.loading"
      leadFlex={3}
      lead={<View style={s.mediaSkeleton} />}
    >
      <View
        style={s.skeletonText}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Skeleton width="24%" />
        <Skeleton width="80%" height={spacing['2xl']} />
        <Skeleton width="92%" />
        <Skeleton width="64%" />
      </View>
    </DetailScaffold>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const s = useStyles(factory);
  const { isWide } = useBreakpoint();

  const [product, setProduct] = useState<Product | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  // Começa a carregar: sem isto, o 1.º render (antes do efeito) mostrava o estado de erro.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>({
    categoryId: '',
    type: 'Product',
    name: '',
    description: '',
    hasMemberBenefit: false,
    memberBenefitDescription: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isOwner = !!user && !!company && company.ownerUserId === user.id;

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const prod = await productsApi.get(id);
      const [co, cats] = await Promise.all([
        companiesApi.get(prod.companyId),
        categoriesApi.list(),
      ]);
      startTransition(() => {
        setProduct(prod);
        setCompany(co);
        setCategories(cats);
      });
    } catch (e) {
      startTransition(() => {
        setNotFound(e instanceof ApiError && e.status === 404);
        setError(e instanceof ApiError ? e.message : 'Não foi possível carregar o produto.');
      });
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  function openEdit() {
    if (!product) return;
    setForm({
      categoryId: product.categoryId,
      type: product.type,
      name: product.name,
      description: product.description,
      hasMemberBenefit: product.hasMemberBenefit,
      memberBenefitDescription: product.memberBenefitDescription ?? '',
    });
    setFormError(null);
    setGalleryError(null);
    setModalVisible(true);
  }

  async function handleDelete() {
    if (!product) return;
    const confirmed = await confirmDestructive({
      title: 'Apagar produto',
      message: `Tem a certeza que quer apagar "${product.name}"?`,
      confirmLabel: 'Apagar',
    });
    if (!confirmed) return;
    setActionError(null);
    setDeleting(true);
    try {
      await productsApi.delete(product.id);
      router.back();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Não foi possível apagar o produto.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('O nome é obrigatório.');
      return;
    }
    if (!form.categoryId) {
      setFormError('Selecione uma categoria.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: UpdateProductRequest = {
        categoryId: form.categoryId,
        type: form.type,
        name: form.name.trim(),
        description: form.description.trim(),
        hasMemberBenefit: form.hasMemberBenefit,
        memberBenefitDescription: form.hasMemberBenefit
          ? form.memberBenefitDescription.trim() || null
          : null,
      };
      const updated = await productsApi.update(id!, payload);
      startTransition(() => {
        setProduct(updated);
        setModalVisible(false);
      });
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];

    setGalleryError(null);
    setUploadingImage(true);
    try {
      const newImage = await productsApi.addImage(id!, asset);
      startTransition(() =>
        setProduct((prev) => (prev ? { ...prev, images: [...prev.images, newImage] } : prev)),
      );
    } catch (e) {
      setGalleryError(e instanceof ApiError ? e.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleFeatureImage(img: ProductImage) {
    if (!product) return;
    setGalleryError(null);
    try {
      await productsApi.featureImage(product.id, img.id);
      startTransition(() =>
        setProduct((prev) =>
          prev
            ? {
                ...prev,
                imageUrl: img.imageUrl,
                images: prev.images.map((i) => ({ ...i, isFeatured: i.id === img.id })),
              }
            : prev,
        ),
      );
    } catch (e) {
      setGalleryError(e instanceof ApiError ? e.message : 'Não foi possível destacar a imagem.');
    }
  }

  async function handleDeleteImage(img: ProductImage) {
    if (!product) return;
    setGalleryError(null);
    setDeletingImageId(img.id);
    try {
      await productsApi.deleteImage(product.id, img.id);
      startTransition(() =>
        setProduct((prev) => {
          if (!prev) return prev;
          const remaining = prev.images.filter((i) => i.id !== img.id);
          const newFeatured = remaining.find((i) => i.isFeatured) ?? remaining[0];
          return { ...prev, imageUrl: newFeatured?.imageUrl ?? null, images: remaining };
        }),
      );
    } catch (e) {
      setGalleryError(e instanceof ApiError ? e.message : 'Não foi possível apagar a imagem.');
    } finally {
      setDeletingImageId(null);
    }
  }

  const flatCategories = (function flatten(cats: Category[]): Category[] {
    return cats.flatMap((c) => [c, ...flatten(c.children)]);
  })(categories);

  const currentCategory = flatCategories.find((c) => c.id === product?.categoryId);

  const labelStyle = {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textSecondary,
    marginTop: 16,
    marginBottom: 6,
  };

  if (loading && !product) return <ProductDetailSkeleton />;

  if (!product) {
    if (notFound) {
      return (
        <StateScreen
          testID="product-detail.not-found"
          icon="magnifying-glass"
          title="Produto não encontrado"
          description="O produto pode ter sido retirado pela empresa ou o endereço está errado."
          actionLabel="Ver o diretório"
          onAction={() => router.replace('/companies')}
        />
      );
    }
    return (
      <DetailScaffold>
        <ErrorState
          testID="product-detail.error"
          message={error ?? 'Não foi possível carregar o produto.'}
          onRetry={load}
        />
      </DetailScaffold>
    );
  }

  const hasImages = product.images.length > 0;
  const lead = hasImages ? (
    <ProductGallery images={product.images} onOpen={setLightboxIndex} />
  ) : isWide ? (
    <GalleryPlaceholder service={product.type === 'Service'} />
  ) : undefined;

  const details = currentCategory
    ? [{ key: 'category', label: 'Categoria', value: currentCategory.name }]
    : [];

  return (
    <View style={styles.container}>
      <DetailScaffold
        testID="product-detail.screen"
        lead={lead}
        leadFlex={3}
        refreshing={loading}
        onRefresh={load}
      >
        <View style={s.identity}>
          <Text variant="label" color="accentText">
            {productTypeLabel(product).toUpperCase()}
          </Text>
          <Text variant="title" testID="product-detail.title" accessibilityRole="header">
            {product.name}
          </Text>
        </View>

        {isOwner ? (
          <View style={s.actions}>
            <Button
              testID="product-detail.edit"
              label="Editar"
              variant="secondary"
              size="sm"
              onPress={openEdit}
            />
            <Button
              testID="product-detail.delete"
              label="Apagar"
              variant="destructive"
              size="sm"
              loading={deleting}
              onPress={handleDelete}
            />
          </View>
        ) : null}
        {actionError ? (
          <InlineAlert tone="error" message={actionError} testID="product-detail.action-error" />
        ) : null}

        {product.description ? (
          <Text variant="body" color="text2">
            {product.description}
          </Text>
        ) : null}

        {product.hasMemberBenefit ? (
          <View style={s.benefit} testID="product-detail.benefit">
            <View style={s.benefitHead}>
              <Icon name="star" size={theme.size.icon.sm} color={theme.colors.accentSoftText} />
              <Text variant="label" style={s.benefitText}>
                BENEFÍCIO PARA MEMBROS
              </Text>
            </View>
            {product.memberBenefitDescription ? (
              <Text variant="body" style={s.benefitText}>
                {product.memberBenefitDescription}
              </Text>
            ) : null}
          </View>
        ) : null}

        {company ? (
          <DetailSection label="EMPRESA">
            <ListGroup>
              <CompanyRow
                testID="product-detail.company"
                company={company}
                last
                density={isWide ? 'compact' : 'regular'}
                onPress={() => router.push(`/companies/${company.id}`)}
              />
            </ListGroup>
          </DetailSection>
        ) : null}

        {details.length > 0 ? (
          <DetailSection label="DETALHES">
            <InfoGroup items={details} testID="product-detail.details" />
          </DetailSection>
        ) : null}
      </DetailScaffold>

      <Modal
        visible={modalVisible}
        title="Editar Produto"
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        saving={saving}
        saveLabel="Guardar"
      >
        {formError && (
          <View
            style={{
              backgroundColor: theme.colors.errorBg,
              borderRadius: theme.radius.sm,
              padding: 10,
              marginBottom: 12,
            }}
          >
            <RNText
              style={{
                fontFamily: theme.fontFamily.body,
                fontSize: theme.fontSize.sm,
                color: theme.colors.error,
              }}
            >
              {formError}
            </RNText>
          </View>
        )}

        <RNText style={labelStyle}>Categoria *</RNText>
        {flatCategories.map((cat) => {
          const selected = form.categoryId === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={[
                styles.pickerOption,
                {
                  borderColor: selected ? theme.colors.accentPrimary : theme.colors.borderDefault,
                  backgroundColor: selected ? theme.colors.infoBg : theme.colors.surfaceSunken,
                },
              ]}
              onPress={() => setForm((f) => ({ ...f, categoryId: cat.id }))}
            >
              <RNText
                style={{
                  fontFamily: theme.fontFamily.body,
                  fontSize: theme.fontSize.base,
                  fontWeight: selected ? theme.fontWeight.semibold : theme.fontWeight.regular,
                  color: selected ? theme.colors.accentText : theme.colors.textPrimary,
                }}
              >
                {cat.name}
              </RNText>
              {selected && <Icon name="check" size={16} color={theme.colors.accentText} />}
            </Pressable>
          );
        })}

        <RNText style={labelStyle}>Tipo *</RNText>
        <View style={styles.typeToggle}>
          {(['Product', 'Service'] as const).map((t) => (
            <Chip
              key={t}
              active={form.type === t}
              onPress={() => setForm((f) => ({ ...f, type: t }))}
              style={styles.typeChip}
            >
              {t === 'Product' ? 'Produto' : 'Serviço'}
            </Chip>
          ))}
        </View>

        <Input
          label="Nome"
          required
          value={form.name}
          onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
          autoFocus
          style={styles.fieldSpacing}
        />

        <Input
          label="Descrição"
          value={form.description}
          onChangeText={(text) => setForm((f) => ({ ...f, description: text }))}
          multiline
          numberOfLines={3}
          style={styles.fieldSpacing}
        />

        <View style={styles.switchRow}>
          <RNText
            style={{
              fontFamily: theme.fontFamily.body,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.textSecondary,
            }}
          >
            Tem benefício para membros
          </RNText>
          <Switch
            value={form.hasMemberBenefit}
            onValueChange={(v) => setForm((f) => ({ ...f, hasMemberBenefit: v }))}
          />
        </View>

        {form.hasMemberBenefit && (
          <Input
            label="Descrição do benefício"
            value={form.memberBenefitDescription}
            onChangeText={(text) => setForm((f) => ({ ...f, memberBenefitDescription: text }))}
            multiline
            numberOfLines={2}
            style={styles.fieldSpacing}
          />
        )}

        <RNText style={labelStyle}>Galeria de imagens</RNText>
        {galleryError ? (
          <InlineAlert tone="error" message={galleryError} testID="product-edit.gallery-error" />
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.compactGallery}
          contentContainerStyle={styles.compactGalleryContent}
        >
          {product.images.map((img, index) => (
            <View key={img.id} style={styles.compactItem}>
              <Pressable onPress={() => setLightboxIndex(index)}>
                <Image
                  source={{ uri: img.imageUrl }}
                  style={[styles.compactImage, { borderRadius: theme.radius.md }]}
                />
              </Pressable>
              {img.isFeatured && (
                <View
                  style={[
                    styles.featuredBadgeSmall,
                    { backgroundColor: theme.colors.accent, borderRadius: theme.radius.xs },
                  ]}
                >
                  <Icon name="star" size={11} color={theme.colors.onAccent} />
                </View>
              )}
              <View style={styles.compactActions}>
                {!img.isFeatured && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Destacar esta imagem"
                    style={[styles.compactActionBtn, { backgroundColor: theme.colors.surface }]}
                    onPress={() => handleFeatureImage(img)}
                    hitSlop={4}
                  >
                    <Icon name="star" size={12} color={theme.colors.text} />
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Apagar esta imagem"
                  style={[styles.compactActionBtn, { backgroundColor: theme.colors.errorBg }]}
                  onPress={() => handleDeleteImage(img)}
                  disabled={deletingImageId === img.id}
                  hitSlop={4}
                >
                  {deletingImageId === img.id ? (
                    <RNText style={{ color: theme.colors.error, fontSize: theme.fontSize['2xs'] }}>
                      …
                    </RNText>
                  ) : (
                    <Icon name="x" size={12} color={theme.colors.error} />
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>

        <LegacyButton
          variant="secondary"
          size="sm"
          onPress={handleAddImage}
          loading={uploadingImage}
          disabled={uploadingImage || product.images.length >= 15}
          style={styles.addImageBtn}
        >
          {product.images.length >= 15 ? 'Máx. 15 imagens' : '+ Adicionar imagem'}
        </LegacyButton>
      </Modal>

      <ImageLightbox
        visible={lightboxIndex !== null}
        images={product.images}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />
    </View>
  );
}

// Só o formulário (`Modal`) usa estes estilos; saem com a B12 (T7).
const styles = StyleSheet.create({
  container: { flex: 1 },
  addImageBtn: { marginTop: 12 },

  compactGallery: { marginTop: 8 },
  compactGalleryContent: { gap: 10, paddingRight: 4 },
  compactItem: { width: 76, position: 'relative' },
  compactImage: { width: 76, height: 76 },
  featuredBadgeSmall: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  compactActions: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    gap: 2,
  },
  compactActionBtn: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
  },
  typeToggle: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, justifyContent: 'center' },
  fieldSpacing: { marginTop: 16 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});
