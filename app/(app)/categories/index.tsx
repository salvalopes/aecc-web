import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useLayoutEffect, useState, startTransition } from 'react';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, combine, slugFormat } from '@/utils/validators';
import type { Category, CreateCategoryRequest } from '@/types/api';
import { useTheme } from '@/theme/ThemeContext';
import { Icon, Button, Input, Modal, EmptyState, ErrorState, LoadingSpinner } from '@/components/ui';

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
  const theme = useTheme();

  return (
    <>
      <View
        style={[
          styles.row,
          {
            paddingLeft: 16 + depth * 24,
            backgroundColor: theme.colors.surfaceCard,
            borderBottomColor: theme.colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.rowInfo}>
          <Text
            style={{
              fontFamily: theme.fontFamily.body,
              fontSize: theme.fontSize.base,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.textPrimary,
            }}
          >
            {category.name}
          </Text>
          <Text
            style={{
              fontFamily: theme.fontFamily.body,
              fontSize: theme.fontSize.xs,
              color: theme.colors.textTertiary,
              marginTop: 2,
            }}
          >
            {category.slug}
          </Text>
        </View>
        {isAdmin && (
          <View style={styles.rowActions}>
            <Pressable onPress={() => onEdit(category)} style={styles.actionBtn}>
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
            <Pressable onPress={() => onDelete(category)} style={styles.actionBtn}>
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
  const theme = useTheme();
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
  const { fieldErrors, formError, validate, clearErrors, applyApiError } = useFormValidation<FormState>();

  useLayoutEffect(() => {
    if (isAdmin) {
      navigation.setOptions({
        headerRight: () => (
          <Button size="sm" onPress={openCreate}>
            + Nova
          </Button>
        ),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    clearErrors();
    setModalVisible(true);
  }

  function openEdit(category: Category) {
    setEditTarget(category);
    setForm({ name: category.name, slug: category.slug, parentId: category.parentId });
    clearErrors();
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
    const isValid = validate(form, {
      name: required('O nome é obrigatório.'),
      slug: combine(required('O slug é obrigatório.'), slugFormat()),
    });
    if (!isValid) return;

    setSaving(true);
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
      applyApiError(e, { Name: 'name', Slug: 'slug' });
    } finally {
      setSaving(false);
    }
  }

  const flatCategories = categories.flatMap(c => [c, ...c.children]);

  if (loading && categories.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surfaceApp }]}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.surfaceApp }]}>
        <ErrorState message={error} onRetry={load} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceApp }]}>
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
        ListEmptyComponent={<EmptyState message="Sem categorias." />}
        refreshing={loading}
        onRefresh={load}
      />

      <Modal
        visible={modalVisible}
        title={editTarget ? 'Editar Categoria' : 'Nova Categoria'}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        saving={saving}
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
            <Text
              style={{
                fontFamily: theme.fontFamily.body,
                fontSize: theme.fontSize.sm,
                color: theme.colors.error,
              }}
            >
              {formError}
            </Text>
          </View>
        )}

        <Input
          label="Nome"
          required
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
          error={fieldErrors.name}
        />

        <Input
          label="Slug"
          required
          value={form.slug}
          onChangeText={text => setForm(f => ({ ...f, slug: text }))}
          placeholder="slug-da-categoria"
          autoCapitalize="none"
          error={fieldErrors.slug}
        />

        <Text
          style={{
            fontFamily: theme.fontFamily.body,
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.textSecondary,
            marginTop: 16,
            marginBottom: 6,
          }}
        >
          Categoria pai (opcional)
        </Text>
        <Pressable
          style={[
            styles.pickerRow,
            {
              borderColor: form.parentId === null ? theme.colors.accentPrimary : theme.colors.borderDefault,
              backgroundColor: theme.colors.surfaceSunken,
              borderRadius: theme.radius.md,
            },
          ]}
          onPress={() => setForm(f => ({ ...f, parentId: null }))}
        >
          <Text
            style={{
              fontFamily: theme.fontFamily.body,
              fontSize: theme.fontSize.base,
              fontWeight: form.parentId === null ? theme.fontWeight.semibold : theme.fontWeight.regular,
              color: form.parentId === null ? theme.colors.accentPrimary : theme.colors.textTertiary,
            }}
          >
            — Sem pai (raiz)
          </Text>
          {form.parentId === null && <Icon name="check" size={16} color={theme.colors.accentPrimary} />}
        </Pressable>
        {flatCategories
          .filter(c => !editTarget || c.id !== editTarget.id)
          .map(c => (
            <Pressable
              key={c.id}
              style={[
                styles.pickerRow,
                {
                  borderColor: form.parentId === c.id ? theme.colors.accentPrimary : theme.colors.borderDefault,
                  backgroundColor: theme.colors.surfaceSunken,
                  borderRadius: theme.radius.md,
                  marginTop: 8,
                },
              ]}
              onPress={() => setForm(f => ({ ...f, parentId: c.id }))}
            >
              <Text
                style={{
                  fontFamily: theme.fontFamily.body,
                  fontSize: theme.fontSize.base,
                  fontWeight: form.parentId === c.id ? theme.fontWeight.semibold : theme.fontWeight.regular,
                  color: form.parentId === c.id ? theme.colors.accentPrimary : theme.colors.textPrimary,
                }}
              >
                {c.name}
              </Text>
              {form.parentId === c.id && <Icon name="check" size={16} color={theme.colors.accentPrimary} />}
            </Pressable>
          ))}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingRight: 16,
  },
  rowInfo: { flex: 1 },
  rowActions: { flexDirection: 'row', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 4 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
});
