import {
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useLayoutEffect, useState, startTransition } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
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
            <TouchableOpacity onPress={openEdit} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
              <Text style={styles.headerDeleteText}>Apagar</Text>
            </TouchableOpacity>
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

  if (loading && !product) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Produto não encontrado.'}</Text>
        <TouchableOpacity onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Gallery — presentation only, no edit controls.
            A plain ScrollView (not FlatList) avoids nesting a virtualized
            list inside the outer vertical ScrollView, which left stale
            rows on screen after the image count shrank (e.g. delete). */}
        {product.images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
            {product.images.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={styles.galleryItemWrap}
                onPress={() => setLightboxIndex(index)}
                activeOpacity={0.9}
              >
                <Image source={{ uri: item.imageUrl }} style={styles.galleryImage} />
                {item.isFeatured && (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>★</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroName}>{product.name}</Text>
            <View style={[styles.typeBadge, product.type === 'Service' && styles.serviceBadge]}>
              <Text style={styles.typeBadgeText}>
                {product.type === 'Product' ? 'Produto' : 'Serviço'}
              </Text>
            </View>
          </View>
          {!!product.description && (
            <Text style={styles.heroDesc}>{product.description}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes</Text>

          {currentCategory && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Categoria</Text>
              <Text style={styles.detailValue}>{currentCategory.name}</Text>
            </View>
          )}

          {company && (
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => router.push(`/(app)/companies/${company.id}`)}
            >
              <Text style={styles.detailLabel}>Empresa</Text>
              <Text style={[styles.detailValue, styles.link]}>{company.name}</Text>
            </TouchableOpacity>
          )}

          {product.hasMemberBenefit && (
            <View style={styles.benefitBox}>
              <Text style={styles.benefitTitle}>★ Benefício para membros</Text>
              {!!product.memberBenefitDescription && (
                <Text style={styles.benefitDesc}>{product.memberBenefitDescription}</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Editar Produto</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveText, saving && styles.disabled]}>
                {saving ? '...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {formError && <Text style={styles.formError}>{formError}</Text>}

            <Text style={styles.label}>Categoria *</Text>
            {flatCategories.map(cat => (
              <Pressable
                key={cat.id}
                style={[styles.pickerOption, form.categoryId === cat.id && styles.pickerOptionSelected]}
                onPress={() => setForm(f => ({ ...f, categoryId: cat.id }))}
              >
                <Text style={form.categoryId === cat.id ? styles.pickerTextSelected : styles.pickerText}>
                  {cat.name}
                </Text>
                {form.categoryId === cat.id && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            ))}

            <Text style={styles.label}>Tipo *</Text>
            <View style={styles.typeToggle}>
              {(['Product', 'Service'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, form.type === t && styles.typeBtnActive]}
                  onPress={() => setForm(f => ({ ...f, type: t }))}
                >
                  <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>
                    {t === 'Product' ? 'Produto' : 'Serviço'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={text => setForm(f => ({ ...f, name: text }))}
              autoFocus
            />

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={form.description}
              onChangeText={text => setForm(f => ({ ...f, description: text }))}
              multiline
              numberOfLines={3}
            />

            <View style={styles.switchRow}>
              <Text style={styles.label}>Tem benefício para membros</Text>
              <Switch
                value={form.hasMemberBenefit}
                onValueChange={v => setForm(f => ({ ...f, hasMemberBenefit: v }))}
                trackColor={{ true: '#0a7ea4' }}
              />
            </View>

            {form.hasMemberBenefit && (
              <>
                <Text style={styles.label}>Descrição do benefício</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={form.memberBenefitDescription}
                  onChangeText={text => setForm(f => ({ ...f, memberBenefitDescription: text }))}
                  multiline
                  numberOfLines={2}
                />
              </>
            )}

            <Text style={styles.label}>Galeria de imagens</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.compactGallery}
              contentContainerStyle={styles.compactGalleryContent}
            >
              {product.images.map((img, index) => (
                <View key={img.id} style={styles.compactItem}>
                  <TouchableOpacity onPress={() => setLightboxIndex(index)} activeOpacity={0.9}>
                    <Image source={{ uri: img.imageUrl }} style={styles.compactImage} />
                  </TouchableOpacity>
                  {img.isFeatured && (
                    <View style={styles.featuredBadgeSmall}>
                      <Text style={styles.featuredBadgeText}>★</Text>
                    </View>
                  )}
                  <View style={styles.compactActions}>
                    {!img.isFeatured && (
                      <TouchableOpacity
                        style={styles.compactActionBtn}
                        onPress={() => handleFeatureImage(img)}
                      >
                        <Text style={styles.compactActionText}>☆</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.compactActionBtn, styles.compactDeleteBtn]}
                      onPress={() => handleDeleteImage(img)}
                      disabled={deletingImageId === img.id}
                    >
                      <Text style={styles.compactActionText}>
                        {deletingImageId === img.id ? '…' : '✕'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.addImageBtnModal, (uploadingImage || product.images.length >= 15) && styles.addImageBtnDisabled]}
              onPress={handleAddImage}
              disabled={uploadingImage || product.images.length >= 15}
            >
              {uploadingImage
                ? <ActivityIndicator size="small" color="#0a7ea4" />
                : <Text style={styles.addImageText}>
                    {product.images.length >= 15 ? 'Máx. 15 imagens' : '+ Adicionar imagem'}
                  </Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scrollContent: { paddingBottom: 40 },
  errorText: { color: '#d32f2f', fontSize: 15, textAlign: 'center', marginBottom: 12 },
  retryBtn: { paddingVertical: 8, paddingHorizontal: 20, borderWidth: 1, borderColor: '#0a7ea4', borderRadius: 8 },
  retryText: { color: '#0a7ea4', fontSize: 14 },

  gallery: { backgroundColor: '#000' },
  galleryItemWrap: { position: 'relative', marginRight: 2 },
  galleryImage: { width: 320, height: 320 },
  featuredBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#f5c518',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  featuredBadgeText: { fontSize: 12, fontWeight: '700', color: '#000' },
  addImageBtnModal: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addImageBtnDisabled: { borderColor: '#ccc' },
  addImageText: { color: '#0a7ea4', fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.4 },

  hero: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  heroName: { fontSize: 22, fontWeight: '800', color: '#111', flex: 1 },
  typeBadge: { backgroundColor: '#e8f5e9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
  serviceBadge: { backgroundColor: '#e3f2fd' },
  typeBadgeText: { fontSize: 12, color: '#444', fontWeight: '600' },
  heroDesc: { fontSize: 14, color: '#555', lineHeight: 20 },
  section: { backgroundColor: '#fff', marginTop: 12, padding: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: { fontSize: 14, color: '#666' },
  detailValue: { fontSize: 14, color: '#111', fontWeight: '500' },
  link: { color: '#0a7ea4' },
  benefitBox: {
    backgroundColor: '#f0f8fc',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#0a7ea4',
  },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: '#0a7ea4', marginBottom: 4 },
  benefitDesc: { fontSize: 13, color: '#444', lineHeight: 18 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  headerBtnText: { color: '#0a7ea4', fontSize: 15, fontWeight: '600' },
  headerDeleteText: { color: '#d32f2f', fontSize: 15, fontWeight: '600' },

  compactGallery: { marginTop: 8 },
  compactGalleryContent: { gap: 10, paddingRight: 4 },
  compactItem: { width: 76, position: 'relative' },
  compactImage: { width: 76, height: 76, borderRadius: 8 },
  featuredBadgeSmall: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#f5c518',
    borderRadius: 4,
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  compactDeleteBtn: { backgroundColor: 'rgba(200,0,0,0.7)' },
  compactActionText: { color: '#fff', fontSize: 11 },

  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  cancelText: { color: '#666', fontSize: 15 },
  saveText: { color: '#0a7ea4', fontSize: 15, fontWeight: '700' },
  modalBody: { flex: 1, padding: 16 },
  formError: {
    color: '#d32f2f',
    fontSize: 13,
    marginBottom: 12,
    backgroundColor: '#fff5f5',
    padding: 10,
    borderRadius: 6,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    marginBottom: 4,
  },
  pickerOptionSelected: { borderColor: '#0a7ea4', backgroundColor: '#f0f8fc' },
  pickerText: { fontSize: 15, color: '#222' },
  pickerTextSelected: { fontSize: 15, color: '#0a7ea4', fontWeight: '600' },
  checkmark: { color: '#0a7ea4', fontSize: 16, fontWeight: '700' },
  typeToggle: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  typeBtnActive: { backgroundColor: '#0a7ea4', borderColor: '#0a7ea4' },
  typeBtnText: { fontSize: 14, color: '#555', fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});
