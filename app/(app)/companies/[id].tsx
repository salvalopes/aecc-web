import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useLayoutEffect, useState, startTransition } from 'react';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { companiesApi } from '@/api/companies.api';
import { productsApi } from '@/api/products.api';
import { ApiError } from '@/api/client';
import type { Company, Product, UpdateCompanyRequest } from '@/types/api';

interface FormState {
  name: string;
  description: string;
  leadCooldownMinutes: string;
  leadDestinationEmail: string;
}

function ProductItem({ product }: { product: Product }) {
  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/(app)/products/${product.id}`)}
    >
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{product.name}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {product.type === 'Product' ? 'Produto' : 'Serviço'}
          </Text>
        </View>
      </View>
      {!!product.description && (
        <Text style={styles.productDesc} numberOfLines={2}>
          {product.description}
        </Text>
      )}
      {product.hasMemberBenefit && (
        <Text style={styles.benefitTag}>★ Benefício membro</Text>
      )}
    </TouchableOpacity>
  );
}

export default function CompanyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    leadCooldownMinutes: '60',
    leadDestinationEmail: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isOwner = !!user && !!company && company.ownerUserId === user.id;

  useLayoutEffect(() => {
    if (isOwner) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity onPress={openEdit} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Editar</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [isOwner, navigation]);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [co, prods] = await Promise.all([
        companiesApi.get(id),
        productsApi.list({ companyId: id }),
      ]);
      startTransition(() => {
        setCompany(co);
        setProducts(prods);
      });
    } catch (e) {
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar empresa.')
      );
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  function openEdit() {
    if (!company) return;
    setForm({
      name: company.name,
      description: company.description,
      leadCooldownMinutes: String(company.leadCooldownMinutes),
      leadDestinationEmail: company.leadDestinationEmail,
    });
    setFormError(null);
    setModalVisible(true);
  }

  async function handleSave() {
    const cooldown = parseInt(form.leadCooldownMinutes, 10);
    if (!form.name.trim()) { setFormError('O nome é obrigatório.'); return; }
    if (!form.leadDestinationEmail.trim()) { setFormError('O email de destino é obrigatório.'); return; }
    if (Number.isNaN(cooldown) || cooldown < 0) { setFormError('Cooldown inválido.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload: UpdateCompanyRequest = {
        name: form.name.trim(),
        description: form.description.trim(),
        leadCooldownMinutes: cooldown,
        leadDestinationEmail: form.leadDestinationEmail.trim(),
      };
      const updated = await companiesApi.update(id!, payload);
      startTransition(() => {
        setCompany(updated);
        setModalVisible(false);
      });
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !company) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (error || !company) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Empresa não encontrada.'}</Text>
        <TouchableOpacity onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ProductItem product={item} />}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <Text style={styles.heroName}>{company.name}</Text>
              {!!company.description && (
                <Text style={styles.heroDesc}>{company.description}</Text>
              )}
              <Text style={styles.heroCooldown}>
                Cooldown leads: {company.leadCooldownMinutes} min
              </Text>
            </View>
            <Text style={styles.sectionTitle}>Produtos e Serviços</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyProducts}>
            <Text style={styles.emptyText}>Sem produtos para esta empresa.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Editar Empresa</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveText, saving && styles.disabled]}>
                {saving ? '...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {formError && <Text style={styles.formError}>{formError}</Text>}

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

            <Text style={styles.label}>Email de destino de leads *</Text>
            <TextInput
              style={styles.input}
              value={form.leadDestinationEmail}
              onChangeText={text => setForm(f => ({ ...f, leadDestinationEmail: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Cooldown de leads (minutos)</Text>
            <TextInput
              style={styles.input}
              value={form.leadCooldownMinutes}
              onChangeText={text => setForm(f => ({ ...f, leadCooldownMinutes: text }))}
              keyboardType="number-pad"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#d32f2f', fontSize: 15, textAlign: 'center', marginBottom: 12 },
  retryBtn: { paddingVertical: 8, paddingHorizontal: 20, borderWidth: 1, borderColor: '#0a7ea4', borderRadius: 8 },
  retryText: { color: '#0a7ea4', fontSize: 14 },
  hero: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  heroName: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 6 },
  heroDesc: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 8 },
  heroCooldown: { fontSize: 12, color: '#999' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: { paddingBottom: 24 },
  productCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  productHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  productName: { fontSize: 15, fontWeight: '700', color: '#111', flex: 1 },
  typeBadge: { backgroundColor: '#f0f0f0', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { fontSize: 11, color: '#555', fontWeight: '600' },
  productDesc: { fontSize: 13, color: '#666' },
  benefitTag: { fontSize: 12, color: '#0a7ea4', marginTop: 6, fontWeight: '600' },
  emptyProducts: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 14 },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  headerBtnText: { color: '#0a7ea4', fontSize: 15, fontWeight: '600' },
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
  textarea: { minHeight: 80, textAlignVertical: 'top' },
});
