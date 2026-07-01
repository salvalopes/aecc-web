import {
  Alert,
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
import { useAuth } from '@/hooks/useAuth';
import { productsApi } from '@/api/products.api';
import { companiesApi } from '@/api/companies.api';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import type { Product, Company, Category, UpdateProductRequest, ProductType } from '@/types/api';

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
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  disabled: { opacity: 0.4 },
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
