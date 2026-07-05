import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEffect, useState, startTransition } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import {
  Icon,
  Button,
  Input,
  Switch,
  Chip,
  Badge,
  Card,
  Modal,
  EmptyState,
  ErrorState,
  LoadingSpinner,
} from '@/components/ui';
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
  const theme = useTheme();
  const thumbUrl = product.imageUrl;

  return (
    <Card
      interactive
      padding={0}
      style={{ flexDirection: 'row', overflow: 'hidden' }}
      onPress={() => router.push(`/(app)/products/${product.id}`)}
    >
      {thumbUrl && <Image source={{ uri: thumbUrl }} style={styles.cardThumb} />}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text
            style={{
              fontFamily: theme.fontFamily.display,
              fontSize: theme.fontSize.base,
              fontWeight: theme.fontWeight.bold,
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
              fontSize: theme.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {product.description}
          </Text>
        )}
        {product.hasMemberBenefit && (
          <View style={styles.benefitTag}>
            <Icon name="star" size={13} color={theme.colors.accentPrimary} />
            <Text
              style={{
                fontFamily: theme.fontFamily.body,
                fontSize: theme.fontSize.xs,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.accentPrimary,
              }}
            >
              Benefício membro
            </Text>
          </View>
        )}
        {canEdit && (
          <View style={[styles.cardActions, { borderTopColor: theme.colors.borderSubtle }]}>
            <Pressable onPress={() => onEdit(product)} style={styles.actionBtn} hitSlop={8}>
              <Icon name="pencil" size={14} color={theme.colors.accentPrimary} />
              <Text
                style={{
                  fontFamily: theme.fontFamily.body,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.accentPrimary,
                }}
              >
                Editar
              </Text>
            </Pressable>
            <Pressable onPress={() => onDelete(product)} style={styles.actionBtn} hitSlop={8}>
              <Icon name="trash-2" size={14} color={theme.colors.error} />
              <Text
                style={{
                  fontFamily: theme.fontFamily.body,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.colors.error,
                }}
              >
                Apagar
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Card>
  );
}

export default function ProductsScreen() {
  const { user } = useAuth();
  const theme = useTheme();
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

  const labelStyle = {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.textSecondary,
    marginTop: 16,
    marginBottom: 6,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceApp }]}>
      {/* Filters */}
      <View
        style={[
          styles.filters,
          { backgroundColor: theme.colors.surfaceCard, borderBottomColor: theme.colors.borderSubtle },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'Product', 'Service'] as const).map(t => (
            <Chip
              key={t}
              active={filterType === t}
              onPress={() => handleFilterType(t)}
              style={styles.filterChipSpacing}
            >
              {t === 'all' ? 'Todos' : t === 'Product' ? 'Produtos' : 'Serviços'}
            </Chip>
          ))}
          {flatCategories.map(cat => (
            <Chip
              key={cat.id}
              active={filterCategory === cat.id}
              onPress={() => handleFilterCategory(filterCategory === cat.id ? '' : cat.id)}
              style={styles.filterChipSpacing}
            >
              {cat.name}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {loading && products.length === 0 ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadProducts()} />
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
          ListEmptyComponent={<EmptyState message="Sem produtos." />}
          refreshing={loading}
          onRefresh={() => loadProducts()}
        />
      )}

      {canCreate && ownedCompanies.length > 0 && (
        <Button onPress={openCreate} style={styles.fab}>+ Novo Produto</Button>
      )}

      <Modal
        visible={modalVisible}
        title={editTarget ? 'Editar Produto' : 'Novo Produto'}
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

        {!editTarget && ownedCompanies.length > 1 && (
          <>
            <Text style={labelStyle}>Empresa *</Text>
            {ownedCompanies.map(c => {
              const selected = form.companyId === c.id;
              return (
                <Pressable
                  key={c.id}
                  style={[
                    styles.pickerOption,
                    {
                      borderColor: selected ? theme.colors.accentPrimary : theme.colors.borderDefault,
                      backgroundColor: selected ? theme.colors.infoBg : theme.colors.surfaceSunken,
                    },
                  ]}
                  onPress={() => setForm(f => ({ ...f, companyId: c.id }))}
                >
                  <Text
                    style={{
                      fontFamily: theme.fontFamily.body,
                      fontSize: theme.fontSize.base,
                      fontWeight: selected ? theme.fontWeight.semibold : theme.fontWeight.regular,
                      color: selected ? theme.colors.accentPrimary : theme.colors.textPrimary,
                    }}
                  >
                    {c.name}
                  </Text>
                  {selected && <Icon name="check" size={16} color={theme.colors.accentPrimary} />}
                </Pressable>
              );
            })}
          </>
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
          placeholder="Nome do produto ou serviço"
          style={styles.fieldSpacing}
        />

        <Input
          label="Descrição"
          value={form.description}
          onChangeText={text => setForm(f => ({ ...f, description: text }))}
          placeholder="Descrição"
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
            placeholder="Descreva o benefício para membros"
            multiline
            numberOfLines={2}
            style={styles.fieldSpacing}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: { borderBottomWidth: 1 },
  filterScroll: { paddingVertical: 10, paddingHorizontal: 12 },
  filterChipSpacing: { marginRight: 8 },
  list: { padding: 12, gap: 10, paddingBottom: 80 },
  cardThumb: { width: 90, height: 90 },
  cardBody: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  benefitTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  fab: { position: 'absolute', bottom: 24, right: 20 },
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
