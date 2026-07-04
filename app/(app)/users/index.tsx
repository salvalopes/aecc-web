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
import { usersApi } from '@/api/users.api';
import { ApiError } from '@/api/client';
import type { ManagedUser, UserRole } from '@/types/api';

const ROLES: UserRole[] = ['Admin', 'Associado', 'Cliente'];

interface FormState {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

const DEFAULT_FORM: FormState = {
  email: '',
  password: '',
  fullName: '',
  role: 'Cliente',
  isActive: true,
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <View style={[styles.badge, styles[`badge${role}`]]}>
      <Text style={styles.badgeText}>{role}</Text>
    </View>
  );
}

function UserRow({
  item,
  isSelf,
  onEdit,
  onDelete,
}: {
  item: ManagedUser;
  isSelf: boolean;
  onEdit: (u: ManagedUser) => void;
  onDelete: (u: ManagedUser) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{item.fullName}</Text>
        <RoleBadge role={item.role} />
      </View>
      <Text style={styles.cardEmail}>{item.email}</Text>
      <View style={styles.statusRow}>
        <Text style={[styles.statusText, item.isActive ? styles.activeText : styles.inactiveText]}>
          {item.isActive ? 'Ativo' : 'Inativo'}
        </Text>
        <Text style={styles.statusDot}>·</Text>
        <Text style={[styles.statusText, item.emailConfirmed ? styles.activeText : styles.pendingText]}>
          {item.emailConfirmed ? 'Email confirmado' : 'Email por confirmar'}
        </Text>
        {isSelf && (
          <>
            <Text style={styles.statusDot}>·</Text>
            <Text style={styles.selfText}>A tua conta</Text>
          </>
        )}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionBtn}>
          <Text style={styles.editText}>Editar</Text>
        </TouchableOpacity>
        {!isSelf && (
          <TouchableOpacity onPress={() => onDelete(item)} style={styles.actionBtn}>
            <Text style={styles.deleteText}>Desativar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function UsersScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/(app)');
    }
  }, [user, isAdmin]);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.list();
      startTransition(() => setUsers(data));
    } catch (e) {
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar utilizadores.')
      );
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (!isAdmin) return null;

  function isSelf(u: ManagedUser) {
    return !!user && u.id === user.id;
  }

  function openCreate() {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setModalVisible(true);
  }

  function openEdit(target: ManagedUser) {
    setEditTarget(target);
    setForm({
      email: target.email,
      password: '',
      fullName: target.fullName,
      role: target.role,
      isActive: target.isActive,
    });
    setFormError(null);
    setModalVisible(true);
  }

  function handleDelete(target: ManagedUser) {
    Alert.alert(
      'Desativar utilizador',
      `Tem a certeza que quer desativar "${target.fullName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            try {
              await usersApi.delete(target.id);
              load();
            } catch (e) {
              Alert.alert(
                'Erro',
                e instanceof ApiError ? e.message : 'Erro ao desativar utilizador.'
              );
            }
          },
        },
      ]
    );
  }

  async function handleSave() {
    if (!form.fullName.trim()) {
      setFormError('O nome é obrigatório.');
      return;
    }
    if (!editTarget) {
      if (!form.email.trim()) {
        setFormError('O email é obrigatório.');
        return;
      }
      if (!form.password) {
        setFormError('A password é obrigatória.');
        return;
      }
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editTarget) {
        await usersApi.update(editTarget.id, {
          fullName: form.fullName.trim(),
          role: form.role,
          isActive: form.isActive,
        });
      } else {
        await usersApi.create({
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          role: form.role,
        });
      }
      setModalVisible(false);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  }

  const editingSelf = editTarget ? isSelf(editTarget) : false;

  return (
    <View style={styles.container}>
      {loading && users.length === 0 ? (
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
          data={users}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <UserRow
              item={item}
              isSelf={isSelf(item)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Sem utilizadores.</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={() => load()}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Text style={styles.fabText}>+ Novo Utilizador</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editTarget ? 'Editar Utilizador' : 'Novo Utilizador'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveText, saving && styles.disabled]}>
                {saving ? '...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {formError && <Text style={styles.formError}>{formError}</Text>}
            {editingSelf && (
              <Text style={styles.selfNotice}>
                Não podes alterar o teu próprio role ou estado de ativação.
              </Text>
            )}

            {!editTarget && (
              <>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={form.email}
                  onChangeText={text => setForm(f => ({ ...f, email: text }))}
                  placeholder="utilizador@exemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />

                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={form.password}
                  onChangeText={text => setForm(f => ({ ...f, password: text }))}
                  placeholder="Password inicial"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </>
            )}

            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              value={form.fullName}
              onChangeText={text => setForm(f => ({ ...f, fullName: text }))}
              placeholder="Nome completo"
            />

            <Text style={styles.label}>Role</Text>
            <View style={styles.roleRow}>
              {ROLES.map(role => (
                <TouchableOpacity
                  key={role}
                  disabled={editingSelf}
                  onPress={() => setForm(f => ({ ...f, role }))}
                  style={[
                    styles.roleChip,
                    form.role === role && styles.roleChipActive,
                    editingSelf && styles.disabled,
                  ]}
                >
                  <Text style={[styles.roleChipText, form.role === role && styles.roleChipTextActive]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {editTarget && (
              <>
                <Text style={styles.label}>Estado</Text>
                <TouchableOpacity
                  disabled={editingSelf}
                  onPress={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  style={[
                    styles.roleChip,
                    form.isActive && styles.roleChipActive,
                    editingSelf && styles.disabled,
                  ]}
                >
                  <Text style={[styles.roleChipText, form.isActive && styles.roleChipTextActive]}>
                    {form.isActive ? 'Ativo' : 'Inativo'}
                  </Text>
                </TouchableOpacity>
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
  cardEmail: { fontSize: 13, color: '#666', marginBottom: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusDot: { color: '#ccc' },
  activeText: { color: '#2e7d32' },
  inactiveText: { color: '#d32f2f' },
  pendingText: { color: '#b26a00' },
  selfText: { fontSize: 12, fontWeight: '600', color: '#0a7ea4' },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeAdmin: { backgroundColor: '#fde8e8' },
  badgeAssociado: { backgroundColor: '#e3f4fb' },
  badgeCliente: { backgroundColor: '#eee' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#333' },
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
  selfNotice: {
    color: '#b26a00',
    fontSize: 13,
    marginBottom: 12,
    backgroundColor: '#fff8e1',
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
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fafafa',
  },
  roleChipActive: { backgroundColor: '#0a7ea4', borderColor: '#0a7ea4' },
  roleChipText: { fontSize: 13, fontWeight: '600', color: '#444' },
  roleChipTextActive: { color: '#fff' },
});
