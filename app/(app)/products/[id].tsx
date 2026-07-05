import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEffect, useLayoutEffect, useState, startTransition } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import {
  Icon,
  Button,
  IconButton,
  Input,
  Switch,
  Chip,
  Badge,
  Modal,
  ErrorState,
  LoadingSpinner,
} from '@/components/ui';
import { productsApi } from '@/api/products.api';
import { companiesApi } from '@/api/companies.api';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import { ImageLightbox } from '@/components/ImageLightbox';
import type { Product, ProductImage, Company, Category, UpdateProductRequest, ProductType } from '@/types/api';

interface FormState {
  categoryId: string;
  type: ProductType;
  name: string;
  description: string;
  hasMemberBenefit: boolean;
  memberBenefitDescription: string;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();
  const theme = useTheme();

  const [product, setProduct] = useState<Product | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isOwner = !!user && !!company && company.ownerUserId === user.id;

  useLayoutEffect(() => {
    if (isOwner) {
      navigation.setOptions({
        headerRight: () => (
          <View style={styles.headerActions}>
            <IconButton icon="pencil" label="Editar" onPress={openEdit} />
            <IconButton icon="trash-2" label="Apagar" tone="danger" onPress={handleDelete} />
          </View>
        ),
      });
    }
  }, [isOwner, navigation]);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
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
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar produto.')
      );
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
    setModalVisible(true);
  }

  function handleDelete() {
    if (!product) return;
    Alert.alert(
      'Apagar produto',
      `Tem a certeza que quer apagar "${product.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await productsApi.delete(product.id);
              router.back();
            } catch (e) {
              Alert.alert('Erro', e instanceof ApiError ? e.message : 'Erro ao apagar produto.');
            }
          },
        },
      ]
    );
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('O nome é obrigatório.'); return; }
    if (!form.categoryId) { setFormError('Selecione uma categoria.'); return; }
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

    setUploadingImage(true);
    try {
      const newImage = await productsApi.addImage(id!, asset);
      startTransition(() =>
        setProduct(prev =>
          prev ? { ...prev, images: [...prev.images, newImage] } : prev
        )
      );
    } catch (e) {
      Alert.alert('Erro', e instanceof ApiError ? e.message : 'Erro ao enviar imagem.');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleFeatureImage(img: ProductImage) {
    if (!product) return;
    try {
      await productsApi.featureImage(product.id, img.id);
      startTransition(() =>
        setProduct(prev =>
          prev
            ? {
                ...prev,
                imageUrl: img.imageUrl,
                images: prev.images.map(i => ({ ...i, isFeatured: i.id === img.id })),
              }
            : prev
        )
      );
    } catch (e) {
      Alert.alert('Erro', e instanceof ApiError ? e.message : 'Erro ao marcar imagem.');
    }
  }

  async function handleDeleteImage(img: ProductImage) {
    if (!product) return;
    setDeletingImageId(img.id);
    try {
      await productsApi.deleteImage(product.id, img.id);
      startTransition(() =>
        setProduct(prev => {
          if (!prev) return prev;
          const remaining = prev.images.filter(i => i.id !== img.id);
          const newFeatured = remaining.find(i => i.isFeatured) ?? remaining[0];
          return { ...prev, imageUrl: newFeatured?.imageUrl ?? null, images: remaining };
        })
      );
    } catch (e) {
      Alert.alert('Erro', e instanceof ApiError ? e.message : 'Erro ao apagar imagem.');
    } finally {
      setDeletingImageId(null);
    }
  }

  const flatCategories = (function flatten(cats: Category[]): Category[] {
    return cats.flatMap(c => [c, ...flatten(c.children)]);
  })(categories);

  const currentCategory = flatCategories.find(c => c.id === product?.categoryId);

  const labelStyle = {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textSecondary,
    marginTop: 16,
    marginBottom: 6,
  };

  if (loading && !product) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surfaceApp }]}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surfaceApp }]}>
        <ErrorState message={error ?? 'Produto não encontrado.'} onRetry={load} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceApp }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Gallery — presentation only, no edit controls.
            A plain ScrollView (not FlatList) avoids nesting a virtualized
            list inside the outer vertical ScrollView, which left stale
            rows on screen after the image count shrank (e.g. delete). */}
        {product.images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
            {product.images.map((item, index) => (
              <Pressable
                key={item.id}
                style={styles.galleryItemWrap}
                onPress={() => setLightboxIndex(index)}
              >
                <Image source={{ uri: item.imageUrl }} style={styles.galleryImage} />
                {item.isFeatured && (
                  <View
                    style={[
                      styles.featuredBadge,
                      { backgroundColor: theme.colors.featured, borderRadius: theme.radius.xs },
                    ]}
                  >
                    <Icon name="star" size={13} color="#403000" />
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View
          style={[
            styles.hero,
            { backgroundColor: theme.colors.surfaceCard, borderBottomColor: theme.colors.borderSubtle },
          ]}
        >
          <View style={styles.heroHeader}>
            <Text
              style={{
                fontFamily: theme.fontFamily.display,
                fontSize: theme.fontSize.xl,
                fontWeight: theme.fontWeight.black,
                color: theme.colors.textPrimary,
                flex: 1,
              }}
            >
              {product.name}
            </Text>
            <Badge tone={product.type === 'Product' ? 'success' : 'info'}>
              {product.type === 'Product' ? 'Produto' : 'Serviço'}
            </Badge>
          </View>
          {!!product.description && (
            <Text
              style={{
                fontFamily: theme.fontFamily.body,
                fontSize: theme.fontSize.base,
                color: theme.colors.textSecondary,
                lineHeight: theme.fontSize.base * theme.lineHeight.normal,
              }}
            >
              {product.description}
            </Text>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.surfaceCard }]}>
          <Text
            style={{
              fontFamily: theme.fontFamily.body,
              fontSize: theme.fontSize.xs,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 12,
            }}
          >
            Detalhes
          </Text>

          {currentCategory && (
            <View style={[styles.detailRow, { borderBottomColor: theme.colors.borderSubtle }]}>
              <Text style={{ fontFamily: theme.fontFamily.body, fontSize: theme.fontSize.base, color: theme.colors.textSecondary }}>
                Categoria
              </Text>
              <Text
                style={{
                  fontFamily: theme.fontFamily.body,
                  fontSize: theme.fontSize.base,
                  color: theme.colors.textPrimary,
                  fontWeight: theme.fontWeight.medium,
                }}
              >
                {currentCategory.name}
              </Text>
            </View>
          )}

          {company && (
            <Pressable
              style={[styles.detailRow, { borderBottomColor: theme.colors.borderSubtle }]}
              onPress={() => router.push(`/(app)/companies/${company.id}`)}
            >
              <Text style={{ fontFamily: theme.fontFamily.body, fontSize: theme.fontSize.base, color: theme.colors.textSecondary }}>
                Empresa
              </Text>
              <Text
                style={{
                  fontFamily: theme.fontFamily.body,
                  fontSize: theme.fontSize.base,
                  color: theme.colors.textLink,
                  fontWeight: theme.fontWeight.medium,
                }}
              >
                {company.name}
              </Text>
            </Pressable>
          )}

          {product.hasMemberBenefit && (
            <View
              style={[
                styles.benefitBox,
                { backgroundColor: theme.colors.infoBg, borderLeftColor: theme.colors.accentPrimary },
              ]}
            >
              <View style={styles.benefitTitleRow}>
                <Icon name="star" size={14} color={theme.colors.accentPrimary} />
                <Text
                  style={{
                    fontFamily: theme.fontFamily.body,
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.colors.accentPrimary,
                  }}
                >
                  Benefício para membros
                </Text>
              </View>
              {!!product.memberBenefitDescription && (
                <Text
                  style={{
                    fontFamily: theme.fontFamily.body,
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.textSecondary,
                    lineHeight: theme.fontSize.sm * theme.lineHeight.normal,
                  }}
                >
                  {product.memberBenefitDescription}
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        title="Editar Produto"
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        saving={saving}
        saveLabel="Guardar"
      >
        {formError && (
          <View style={{ backgroundColor: theme.colors.errorBg, borderRadius: theme.radius.sm, padding: 10, marginBottom: 12 }}>
            <Text style={{ fontFamily: theme.fontFamily.body, fontSize: theme.fontSize.sm, color: theme.colors.error }}>
              {formError}
            </Text>
          </View>
        )}

        <Text style={labelStyle}>Categoria *</Text>
        {flatCategories.map(cat => {
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
              onPress={() => setForm(f => ({ ...f, categoryId: cat.id }))}
            >
              <Text
                style={{
                  fontFamily: theme.fontFamily.body,
                  fontSize: theme.fontSize.base,
                  fontWeight: selected ? theme.fontWeight.semibold : theme.fontWeight.regular,
                  color: selected ? theme.colors.accentPrimary : theme.colors.textPrimary,
                }}
              >
                {cat.name}
              </Text>
              {selected && <Icon name="check" size={16} color={theme.colors.accentPrimary} />}
            </Pressable>
          );
        })}

        <Text style={labelStyle}>Tipo *</Text>
        <View style={styles.typeToggle}>
          {(['Product', 'Service'] as const).map(t => (
            <Chip
              key={t}
              active={form.type === t}
              onPress={() => setForm(f => ({ ...f, type: t }))}
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
          onChangeText={text => setForm(f => ({ ...f, name: text }))}
          autoFocus
          style={styles.fieldSpacing}
        />

        <Input
          label="Descrição"
          value={form.description}
          onChangeText={text => setForm(f => ({ ...f, description: text }))}
          multiline
          numberOfLines={3}
          style={styles.fieldSpacing}
        />

        <View style={styles.switchRow}>
          <Text
            style={{
              fontFamily: theme.fontFamily.body,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.textSecondary,
            }}
          >
            Tem benefício para membros
          </Text>
          <Switch
            value={form.hasMemberBenefit}
            onValueChange={v => setForm(f => ({ ...f, hasMemberBenefit: v }))}
          />
        </View>

        {form.hasMemberBenefit && (
          <Input
            label="Descrição do benefício"
            value={form.memberBenefitDescription}
            onChangeText={text => setForm(f => ({ ...f, memberBenefitDescription: text }))}
            multiline
            numberOfLines={2}
            style={styles.fieldSpacing}
          />
        )}

        <Text style={labelStyle}>Galeria de imagens</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.compactGallery}
          contentContainerStyle={styles.compactGalleryContent}
        >
          {product.images.map((img, index) => (
            <View key={img.id} style={styles.compactItem}>
              <Pressable onPress={() => setLightboxIndex(index)}>
                <Image source={{ uri: img.imageUrl }} style={[styles.compactImage, { borderRadius: theme.radius.md }]} />
              </Pressable>
              {img.isFeatured && (
                <View
                  style={[
                    styles.featuredBadgeSmall,
                    { backgroundColor: theme.colors.featured, borderRadius: theme.radius.xs },
                  ]}
                >
                  <Icon name="star" size={11} color="#403000" />
                </View>
              )}
              <View style={styles.compactActions}>
                {!img.isFeatured && (
                  <Pressable
                    style={[styles.compactActionBtn, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
                    onPress={() => handleFeatureImage(img)}
                    hitSlop={4}
                  >
                    <Icon name="star" size={12} color="#fff" />
                  </Pressable>
                )}
                <Pressable
                  style={[styles.compactActionBtn, { backgroundColor: theme.colors.error }]}
                  onPress={() => handleDeleteImage(img)}
                  disabled={deletingImageId === img.id}
                  hitSlop={4}
                >
                  {deletingImageId === img.id ? (
                    <Text style={{ color: '#fff', fontSize: theme.fontSize['2xs'] }}>…</Text>
                  ) : (
                    <Icon name="x" size={12} color="#fff" />
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>

        <Button
          variant="secondary"
          size="sm"
          onPress={handleAddImage}
          loading={uploadingImage}
          disabled={uploadingImage || product.images.length >= 15}
          style={styles.addImageBtn}
        >
          {product.images.length >= 15 ? 'Máx. 15 imagens' : '+ Adicionar imagem'}
        </Button>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scrollContent: { paddingBottom: 40 },

  gallery: { backgroundColor: '#000' },
  galleryItemWrap: { position: 'relative', marginRight: 2 },
  galleryImage: { width: 320, height: 320 },
  featuredBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  addImageBtn: { marginTop: 12 },

  hero: {
    padding: 20,
    borderBottomWidth: 1,
  },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  section: { marginTop: 12, padding: 16 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  benefitBox: {
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
  },
  benefitTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  headerActions: { flexDirection: 'row', gap: 4 },

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
