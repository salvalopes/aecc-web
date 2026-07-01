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
import { useEffect, useState, startTransition } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { companiesApi } from '@/api/companies.api';
import { ApiError } from '@/api/client';
import type { Company, CreateCompanyRequest } from '@/types/api';

interface FormState {
  name: string;
  description: string;
  leadCooldownMinutes: string;
  leadDestinationEmail: string;
}

const DEFAULT_FORM: FormState = {
  name: '',
  description: '',
  leadCooldownMinutes: '60',
  leadDestinationEmail: '',
};

function CompanyCard({
  company,
  isOwner,
  onEdit,
  onDelete,
}: {
  company: Company;
  isOwner: boolean;
  onEdit: (c: Company) => void;
  onDelete: (c: Company) => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/companies/${company.id}`)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{company.name}</Text>
        {isOwner && (
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>Minha</Text>
          </View>
        )}
      </View>
      {!!company.description && (
        <Text style={styles.cardDesc} numberOfLines={2}>
          {company.description}
        </Text>
      )}
      {isOwner && (
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => onEdit(company)} style={styles.actionBtn}>
            <Text style={styles.editText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(company)} style={styles.actionBtn}>
            <Text style={styles.deleteText}>Apagar</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function CompaniesScreen() {
  const { user } = useAuth();
  const canCreate = user?.role === 'Admin' || user?.role === 'Associado';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load(name?: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await companiesApi.list(name ? { name } : undefined);
      startTransition(() => setCompanies(data));
    } catch (e) {
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar empresas.')
      );
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
  }, []);

  function isOwner(company: Company) {
    return !!user && company.ownerUserId === user.id;
  }

  function openCreate() {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setModalVisible(true);
  }

  function openEdit(company: Company) {
    setEditTarget(company);
    setForm({
      name: company.name,
      description: company.description,
      leadCooldownMinutes: String(company.leadCooldownMinutes),
      leadDestinationEmail: company.leadDestinationEmail,
    });
    setFormError(null);
    setModalVisible(true);
  }

  function handleDelete(company: Company) {
    Alert.alert(
      'Apagar empresa',
      `Tem a certeza que quer apagar "${company.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await companiesApi.delete(company.id);
              load();
            } catch (e) {
              Alert.alert(
                'Erro',
                e instanceof ApiError ? e.message : 'Erro ao apagar empresa.'
              );
            }
          },
        },
      ]
    );
  }

  async function handleSave() {
    const cooldown = parseInt(form.leadCooldownMinutes, 10);
    if (!form.name.trim()) {
      setFormError('O nome é obrigatório.');
      return;
    }
    if (!form.leadDestinationEmail.trim()) {
      setFormError('O email de destino é obrigatório.');
      return;
    }
    if (Number.isNaN(cooldown) || cooldown < 0) {
      setFormError('O cooldown deve ser um número positivo.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: CreateCompanyRequest = {
        name: form.name.trim(),
        description: form.description.trim(),
        leadCooldownMinutes: cooldown,
        leadDestinationEmail: form.leadDestinationEmail.trim(),
      };
      if (editTarget) {
        await companiesApi.update(editTarget.id, payload);
      } else {
        await companiesApi.create(payload);
      }
      setModalVisible(false);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  }

  const filtered = search.trim()
    ? companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : companies;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={text => {
            setSearch(text);
            if (text.trim().length > 1) load(text.trim());
            else if (text.trim().length === 0) load();
          }}
          placeholder="Pesquisar empresas..."
          clearButtonMode="while-editing"
        />
      </View>

      {loading && companies.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CompanyCard
              company={item}
              isOwner={isOwner(item)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Sem empresas.</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={() => load()}
        />
      )}

      {canCreate && (
        <TouchableOpacity style={styles.fab} onPress={openCreate}>
          <Text style={styles.fabText}>+ Nova Empresa</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editTarget ? 'Editar Empresa' : 'Nova Empresa'}
            </Text>
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
              placeholder="Nome da empresa"
              autoFocus
            />

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={form.description}
              onChangeText={text => setForm(f => ({ ...f, description: text }))}
              placeholder="Descrição da empresa"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Email de destino de leads *</Text>
            <TextInput
              style={styles.input}
              value={form.leadDestinationEmail}
              onChangeText={text => setForm(f => ({ ...f, leadDestinationEmail: text }))}
              placeholder="leads@empresa.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Cooldown de leads (minutos)</Text>
            <TextInput
              style={styles.input}
              value={form.leadCooldownMinutes}
              onChangeText={text => setForm(f => ({ ...f, leadCooldownMinutes: text }))}
              placeholder="60"
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
  searchBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  list: { padding: 12, gap: 10 },
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
  cardName: { fontSize: 16, fontWeight: '700', color: '#111', flex: 1 },
  cardDesc: { fontSize: 13, color: '#666', marginBottom: 8 },
  ownerBadge: {
    backgroundColor: '#e3f4fb',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ownerBadgeText: { fontSize: 11, color: '#0a7ea4', fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  actionBtn: { paddingVertical: 4 },
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
  textarea: { minHeight: 80, textAlignVertical: 'top' },
});
