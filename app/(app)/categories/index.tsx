import {
  Alert,
  FlatList,
  Modal,
  Pressable,
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
import { useNavigation } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import type { Category, CreateCategoryRequest } from '@/types/api';

interface FormState {
  name: string;
  slug: string;
  parentId: string | null;
}

const DEFAULT_FORM: FormState = { name: '', slug: '', parentId: null };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function CategoryRow({
  category,
  depth,
  isAdmin,
  onEdit,
  onDelete,
}: {
  category: Category;
  depth: number;
  isAdmin: boolean;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  return (
    <>
      <View style={[styles.row, { paddingLeft: 16 + depth * 24 }]}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{category.name}</Text>
          <Text style={styles.rowSlug}>{category.slug}</Text>
        </View>
        {isAdmin && (
          <View style={styles.rowActions}>
            <TouchableOpacity onPress={() => onEdit(category)} style={styles.actionBtn}>
              <Text style={styles.editText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(category)} style={styles.actionBtn}>
              <Text style={styles.deleteText}>Apagar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {category.children.map(child => (
        <CategoryRow
          key={child.id}
          category={child}
          depth={depth + 1}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

export default function CategoriesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const isAdmin = user?.role === 'Admin';

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (isAdmin) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity onPress={openCreate} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>+ Nova</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [isAdmin, navigation]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await categoriesApi.list();
      startTransition(() => setCategories(data));
    } catch (e) {
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar categorias.')
      );
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setModalVisible(true);
  }

  function openEdit(category: Category) {
    setEditTarget(category);
    setForm({ name: category.name, slug: category.slug, parentId: category.parentId });
    setFormError(null);
    setModalVisible(true);
  }

  function handleDelete(category: Category) {
    Alert.alert(
      'Apagar categoria',
      `Tem a certeza que quer apagar "${category.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await categoriesApi.delete(category.id);
              load();
            } catch (e) {
              Alert.alert(
                'Erro',
                e instanceof ApiError ? e.message : 'Erro ao apagar categoria.'
              );
            }
          },
        },
      ]
    );
  }

  async function handleSave() {
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError('Nome e slug são obrigatórios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: CreateCategoryRequest = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        parentId: form.parentId ?? undefined,
      };
      if (editTarget) {
        await categoriesApi.update(editTarget.id, payload);
      } else {
        await categoriesApi.create(payload);
      }
      setModalVisible(false);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Erro ao guardar.');
    } finally {
      setSaving(false);
    }
  }

  const flatCategories = categories.flatMap(c => [c, ...c.children]);

  if (loading && categories.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CategoryRow
            category={item}
            depth={0}
            isAdmin={isAdmin}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Sem categorias.</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={load}
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editTarget ? 'Editar Categoria' : 'Nova Categoria'}
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
              onChangeText={text =>
                setForm(f => ({
                  ...f,
                  name: text,
                  slug: editTarget ? f.slug : slugify(text),
                }))
              }
              placeholder="Nome da categoria"
              autoFocus
            />

            <Text style={styles.label}>Slug *</Text>
            <TextInput
              style={styles.input}
              value={form.slug}
              onChangeText={text => setForm(f => ({ ...f, slug: text }))}
              placeholder="slug-da-categoria"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Categoria pai (opcional)</Text>
            <Pressable
              style={[styles.input, styles.pickerRow]}
              onPress={() =>
                setForm(f => ({ ...f, parentId: null }))
              }
            >
              <Text style={form.parentId === null ? styles.selectedText : styles.inputPlaceholder}>
                — Sem pai (raiz)
              </Text>
              {form.parentId === null && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
            {flatCategories
              .filter(c => !editTarget || c.id !== editTarget.id)
              .map(c => (
                <Pressable
                  key={c.id}
                  style={[styles.input, styles.pickerRow]}
                  onPress={() => setForm(f => ({ ...f, parentId: c.id }))}
                >
                  <Text style={form.parentId === c.id ? styles.selectedText : styles.inputText}>
                    {c.name}
                  </Text>
                  {form.parentId === c.id && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>
              ))}
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
  emptyText: { color: '#999', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
    paddingRight: 16,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#222' },
  rowSlug: { fontSize: 12, color: '#999', marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  editText: { color: '#0a7ea4', fontSize: 13, fontWeight: '600' },
  deleteText: { color: '#d32f2f', fontSize: 13, fontWeight: '600' },
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
    marginBottom: 4,
  },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputText: { fontSize: 15, color: '#222' },
  inputPlaceholder: { fontSize: 15, color: '#999' },
  selectedText: { fontSize: 15, color: '#0a7ea4', fontWeight: '600' },
  checkmark: { color: '#0a7ea4', fontSize: 16, fontWeight: '700' },
});
