import {
  Alert,
  FlatList,
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
import { useEffect, useState, startTransition } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { productsApi } from '@/api/products.api';
import { companiesApi } from '@/api/companies.api';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import type { Product, Company, Category, CreateProductRequest, ProductType } from '@/types/api';

interface FormState {
  companyId: string;
  categoryId: string;
  type: ProductType;
  name: string;
  description: string;
  hasMemberBenefit: boolean;
  memberBenefitDescription: string;
}

const DEFAULT_FORM: FormState = {
  companyId: '',
  categoryId: '',
  type: 'Product',
  name: '',
  description: '',
  hasMemberBenefit: false,
  memberBenefitDescription: '',
};

function ProductCard({
  product,
  canEdit,
  onEdit,
  onDelete,
}: {
  product: Product;
  canEdit: boolean;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/products/${product.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{product.name}</Text>
        <View style={[styles.typeBadge, product.type === 'Service' && styles.serviceBadge]}>
          <Text style={styles.typeBadgeText}>
            {product.type === 'Product' ? 'Produto' : 'Serviço'}
          </Text>
        </View>
      </View>
      {!!product.description && (
        <Text style={styles.cardDesc} numberOfLines={2}>{product.description}</Text>
      )}
      {product.hasMemberBenefit && (
        <Text style={styles.benefitTag}>★ Benefício membro</Text>
      )}
      {canEdit && (
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => onEdit(product)} style={styles.actionBtn}>
            <Text style={styles.editText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(product)} style={styles.actionBtn}>
            <Text style={styles.deleteText}>Apagar</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ProductsScreen() {
  const { user } = useAuth();
  const canCreate = user?.role === 'Admin' || user?.role === 'Associado';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ownedCompanies, setOwnedCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<'all' | 'Product' | 'Service'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadProducts(type?: 'Product' | 'Service', categoryId?: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await productsApi.list({
        type: type ?? (filterType !== 'all' ? filterType : undefined),
        categoryId: categoryId ?? (filterCategory || undefined),
      });
      startTransition(() => setProducts(data));
    } catch (e) {
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar produtos.')
      );
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  async function loadMeta() {
    try {
      const [cats, companies] = await Promise.all([
        categoriesApi.list(),
        canCreate ? companiesApi.getMine() : Promise.resolve([] as Company[]),
      ]);
      startTransition(() => {
        setCategories(cats);
        setOwnedCompanies(companies);
      });
    } catch {
      // meta errors are non-blocking
    }
  }

  useEffect(() => {
    loadProducts();
    loadMeta();
  }, []);

  function canEditProduct(product: Product) {
    return ownedCompanies.some(c => c.id === product.companyId);
  }

  function handleFilterType(type: 'all' | 'Product' | 'Service') {
    setFilterType(type);
    loadProducts(type !== 'all' ? type : undefined, filterCategory || undefined);
  }

  function handleFilterCategory(catId: string) {
    setFilterCategory(catId);
    loadProducts(filterType !== 'all' ? filterType : undefined, catId || undefined);
  }

  function openCreate() {
    setEditTarget(null);
    const firstCompany = ownedCompanies[0];
    setForm({
      ...DEFAULT_FORM,
      companyId: firstCompany?.id ?? '',
    });
    setFormError(null);
    setModalVisible(true);
  }

  function openEdit(product: Product) {
    setEditTarget(product);
    setForm({
      companyId: product.companyId,
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

  function handleDelete(product: Product) {
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
              loadProducts();
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
    if (!form.companyId) { setFormError('Selecione uma empresa.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload: CreateProductRequest = {
        companyId: form.companyId,
        categoryId: form.categoryId,
        type: form.type,
        name: form.name.trim(),
        description: form.description.trim(),
        hasMemberBenefit: form.hasMemberBenefit,
        memberBenefitDescription: form.hasMemberBenefit
          ? form.memberBenefitDescription.trim() || null
          : null,
      };
      if (editTarget) {
        await productsApi.update(editTarget.id, {
          categoryId: payload.categoryId,
          type: payload.type,
          name: payload.name,
          description: payload.description,
          hasMemberBenefit: payload.hasMemberBenefit,
          memberBenefitDescription: payload.memberBenefitDescription,
        });
      } else {
        await productsApi.create(payload);
      }
      setModalVisible(false);
      loadProducts();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  }

  const flatCategories = (function flatten(cats: Category[]): Category[] {
    return cats.flatMap(c => [c, ...flatten(c.children)]);
  })(categories);

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['all', 'Product', 'Service'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.filterChip, filterType === t && styles.filterChipActive]}
              onPress={() => handleFilterType(t)}
            >
              <Text style={[styles.filterChipText, filterType === t && styles.filterChipTextActive]}>
                {t === 'all' ? 'Todos' : t === 'Product' ? 'Produtos' : 'Serviços'}
              </Text>
            </TouchableOpacity>
          ))}
          {flatCategories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterChip, filterCategory === cat.id && styles.filterChipActive]}
              onPress={() => handleFilterCategory(filterCategory === cat.id ? '' : cat.id)}
            >
              <Text style={[styles.filterChipText, filterCategory === cat.id && styles.filterChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadProducts()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              canEdit={canEditProduct(item)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Sem produtos.</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={() => loadProducts()}
        />
      )}

      {canCreate && ownedCompanies.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={openCreate}>
          <Text style={styles.fabText}>+ Novo Produto</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editTarget ? 'Editar Produto' : 'Novo Produto'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveText, saving && styles.disabled]}>
                {saving ? '...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {formError && <Text style={styles.formError}>{formError}</Text>}

            {!editTarget && ownedCompanies.length > 1 && (
              <>
                <Text style={styles.label}>Empresa *</Text>
                {ownedCompanies.map(c => (
                  <Pressable
                    key={c.id}
                    style={[styles.pickerOption, form.companyId === c.id && styles.pickerOptionSelected]}
                    onPress={() => setForm(f => ({ ...f, companyId: c.id }))}
                  >
                    <Text style={form.companyId === c.id ? styles.pickerTextSelected : styles.pickerText}>
                      {c.name}
                    </Text>
                    {form.companyId === c.id && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>
                ))}
              </>
            )}

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
              placeholder="Nome do produto ou serviço"
            />

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={form.description}
              onChangeText={text => setForm(f => ({ ...f, description: text }))}
              placeholder="Descrição"
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
                  placeholder="Descreva o benefício para membros"
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
  filters: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterScroll: { paddingVertical: 10, paddingHorizontal: 12 },
  filterChip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  filterChipActive: { backgroundColor: '#0a7ea4', borderColor: '#0a7ea4' },
  filterChipText: { fontSize: 13, color: '#555' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 12, gap: 10, paddingBottom: 80 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#111', flex: 1 },
  typeBadge: { backgroundColor: '#e8f5e9', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  serviceBadge: { backgroundColor: '#e3f2fd' },
  typeBadgeText: { fontSize: 11, color: '#555', fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#666', marginBottom: 4 },
  benefitTag: { fontSize: 12, color: '#0a7ea4', fontWeight: '600', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  actionBtn: { paddingVertical: 2 },
  editText: { color: '#0a7ea4', fontSize: 13, fontWeight: '600' },
  deleteText: { color: '#d32f2f', fontSize: 13, fontWeight: '600' },
  errorText: { color: '#d32f2f', fontSize: 15, textAlign: 'center', marginBottom: 12 },
  retryBtn: { paddingVertical: 8, paddingHorizontal: 20, borderWidth: 1, borderColor: '#0a7ea4', borderRadius: 8 },
  retryText: { color: '#0a7ea4', fontSize: 14 },
  emptyText: { color: '#999', fontSize: 15 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#0a7ea4',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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
