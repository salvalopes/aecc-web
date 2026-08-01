import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState, startTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/api/users.api';
import { ApiError } from '@/api/client';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, emailFormat, passwordStrength, combine } from '@/utils/validators';
import type { ManagedUser, UserRole } from '@/types/api';
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
import { RoleGuard } from '@/components/RoleGuard';

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

function roleBadgeTone(role: UserRole): 'error' | 'info' | 'neutral' {
  if (role === 'Admin') return 'error';
  if (role === 'Associado') return 'info';
  return 'neutral';
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
  const theme = useTheme();

  return (
    <Card>
      <View style={styles.cardHeader}>
        <Text
          style={{
            fontFamily: theme.fontFamily.display,
            fontSize: theme.fontSize.md,
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.textPrimary,
            flex: 1,
          }}
        >
          {item.fullName}
        </Text>
        <Badge tone={roleBadgeTone(item.role)}>{item.role}</Badge>
      </View>
      <Text
        style={{
          fontFamily: theme.fontFamily.body,
          fontSize: theme.fontSize.sm,
          color: theme.colors.textSecondary,
          marginBottom: 6,
        }}
      >
        {item.email}
      </Text>
      <View style={styles.statusRow}>
        <Text
          style={{
            fontFamily: theme.fontFamily.body,
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.semibold,
            color: item.isActive ? theme.colors.success : theme.colors.error,
          }}
        >
          {item.isActive ? 'Ativo' : 'Inativo'}
        </Text>
        <Text style={{ color: theme.colors.borderStrong }}>·</Text>
        <Text
          style={{
            fontFamily: theme.fontFamily.body,
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.semibold,
            color: item.emailConfirmed ? theme.colors.success : theme.colors.warning,
          }}
        >
          {item.emailConfirmed ? 'Email confirmado' : 'Email por confirmar'}
        </Text>
        {isSelf && (
          <>
            <Text style={{ color: theme.colors.borderStrong }}>·</Text>
            <Text
              style={{
                fontFamily: theme.fontFamily.body,
                fontSize: theme.fontSize.xs,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.accentPrimary,
              }}
            >
              A tua conta
            </Text>
          </>
        )}
      </View>
      <View style={styles.cardActions}>
        <Pressable onPress={() => onEdit(item)} style={styles.actionBtn}>
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
        {!isSelf && (
          <Pressable onPress={() => onDelete(item)} style={styles.actionBtn}>
            <Icon name="trash-2" size={14} color={theme.colors.error} />
            <Text
              style={{
                fontFamily: theme.fontFamily.body,
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.semibold,
                color: theme.colors.error,
              }}
            >
              Desativar
            </Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

export default function UsersScreen() {
  return (
    <RoleGuard allow={['Admin']}>
      <UsersContent />
    </RoleGuard>
  );
}

function UsersContent() {
  const theme = useTheme();
  const { user } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, validate, clearErrors, applyApiError } = useFormValidation<FormState>();

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
    load();
  }, []);

  function isSelf(u: ManagedUser) {
    return !!user && u.id === user.id;
  }

  function openCreate() {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    clearErrors();
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
    clearErrors();
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
    const isValid = editTarget
      ? validate(form, { fullName: required('O nome é obrigatório.') })
      : validate(form, {
          email: combine(required('O email é obrigatório.'), emailFormat()),
          password: passwordStrength(),
          fullName: required('O nome é obrigatório.'),
        });
    if (!isValid) return;

    setSaving(true);
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
      applyApiError(e, {
        Email: 'email',
        Password: 'password',
        FullName: 'fullName',
        DuplicateUserName: 'email',
        DuplicateEmail: 'email',
        InvalidEmail: 'email',
        PasswordTooShort: 'password',
        PasswordRequiresDigit: 'password',
        PasswordRequiresLower: 'password',
        PasswordRequiresUpper: 'password',
        PasswordRequiresNonAlphanumeric: 'password',
        PasswordRequiresUniqueChars: 'password',
      });
    } finally {
      setSaving(false);
    }
  }

  const editingSelf = editTarget ? isSelf(editTarget) : false;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceApp }]}>
      {loading && users.length === 0 ? (
        <View style={styles.center}>
          <LoadingSpinner />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ErrorState message={error} onRetry={() => load()} />
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
          ListEmptyComponent={<EmptyState message="Sem utilizadores." />}
          refreshing={loading}
          onRefresh={() => load()}
        />
      )}

      <Button style={styles.fab} onPress={openCreate}>
        + Novo Utilizador
      </Button>

      <Modal
        visible={modalVisible}
        title={editTarget ? 'Editar Utilizador' : 'Novo Utilizador'}
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
        {editingSelf && (
          <View
            style={{
              backgroundColor: theme.colors.warningBg,
              borderRadius: theme.radius.sm,
              padding: 10,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontFamily: theme.fontFamily.body,
                fontSize: theme.fontSize.sm,
                color: theme.colors.warning,
              }}
            >
              Não podes alterar o teu próprio role ou estado de ativação.
            </Text>
          </View>
        )}

        {!editTarget && (
          <>
            <Input
              label="Email"
              required
              value={form.email}
              onChangeText={text => setForm(f => ({ ...f, email: text }))}
              placeholder="utilizador@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
              error={fieldErrors.email}
            />

            <Input
              label="Password"
              required
              value={form.password}
              onChangeText={text => setForm(f => ({ ...f, password: text }))}
              placeholder="Password inicial"
              secureTextEntry
              autoCapitalize="none"
              error={fieldErrors.password}
            />
          </>
        )}

        <Input
          label="Nome"
          required
          value={form.fullName}
          onChangeText={text => setForm(f => ({ ...f, fullName: text }))}
          placeholder="Nome completo"
          error={fieldErrors.fullName}
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
          Role
        </Text>
        <View style={styles.roleRow}>
          {ROLES.map(role => (
            <Chip
              key={role}
              active={form.role === role}
              onPress={editingSelf ? undefined : () => setForm(f => ({ ...f, role }))}
            >
              {role}
            </Chip>
          ))}
        </View>

        {editTarget && (
          <>
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
              Estado
            </Text>
            <View style={styles.estadoRow}>
              <Switch
                value={form.isActive}
                onValueChange={value => setForm(f => ({ ...f, isActive: value }))}
                disabled={editingSelf}
              />
              <Text
                style={{
                  fontFamily: theme.fontFamily.body,
                  fontSize: theme.fontSize.base,
                  color: theme.colors.textPrimary,
                }}
              >
                {form.isActive ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  list: { padding: 12, gap: 10, paddingBottom: 80 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  fab: { position: 'absolute', bottom: 24, right: 20 },
  roleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  estadoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
