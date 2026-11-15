import { Alert, StyleSheet, View } from 'react-native';
import { useEffect, useState, startTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/api/users.api';
import { ApiError } from '@/api/client';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, emailFormat, passwordStrength, combine } from '@/utils/validators';
import type { ManagedUser, UserRole } from '@/types/api';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Input, Switch, Chip, Modal } from '@/components/ui';
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  ListGroup,
  ListRow,
  Plate,
  SkeletonRow,
  Text,
} from '@/components/ds';
import { ListScaffold } from '@/components/templates/ListScaffold';
import { useRequireRole } from '@/hooks/useRequireRole';
import { ForbiddenState, SessionLoadingState } from '@/components/templates/StateTemplates';

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

const ROLE_SECTION: Record<UserRole, string> = {
  Admin: 'ADMINISTRADORES',
  Associado: 'ASSOCIADOS',
  Cliente: 'CLIENTES',
};

const factory = createStyles(({ spacing }) => ({
  sections: { gap: spacing['2xl'] },
  section: { gap: spacing.sm },
  sectionLabel: { paddingHorizontal: spacing.xs },
  text: { flex: 1, minWidth: 0, gap: spacing['2xs'] },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', alignItems: 'center' },
}));

function statusLine(u: ManagedUser): { text: string; color: 'error' | 'text3' } | null {
  if (!u.isActive) return { text: 'Conta inativa', color: 'error' };
  if (!u.emailConfirmed) return { text: 'Email por confirmar', color: 'text3' };
  return null;
}

function UserRow({
  item,
  isSelf,
  last,
  onEdit,
  onDelete,
}: {
  item: ManagedUser;
  isSelf: boolean;
  last: boolean;
  onEdit: (u: ManagedUser) => void;
  onDelete: (u: ManagedUser) => void;
}) {
  const s = useStyles(factory);
  const status = statusLine(item);
  return (
    <ListRow testID="users.row" last={last}>
      <Plate company={{ name: item.fullName, tradeName: null, logoUrl: null }} />
      <View style={s.text}>
        <View style={s.nameLine}>
          <Text variant="name" numberOfLines={1}>
            {item.fullName}
          </Text>
          {isSelf ? (
            <Text variant="label" color="accentText">
              A TUA CONTA
            </Text>
          ) : null}
        </View>
        <Text variant="meta" numberOfLines={1}>
          {item.email}
        </Text>
        {status ? (
          <Text variant="meta" color={status.color} numberOfLines={1}>
            {status.text}
          </Text>
        ) : null}
      </View>
      <View style={s.actions}>
        <IconButton
          testID="users.edit"
          icon="pencil-simple"
          label={`Editar ${item.fullName}`}
          onPress={() => onEdit(item)}
        />
        {!isSelf && item.isActive ? (
          <IconButton
            testID="users.deactivate"
            icon="trash"
            label={`Desativar ${item.fullName}`}
            onPress={() => onDelete(item)}
          />
        ) : null}
      </View>
    </ListRow>
  );
}

export default function UsersScreen() {
  // O papel decide antes de montar o conteúdo (e os seus efeitos de dados).
  const { allowed, checking } = useRequireRole(['Admin']);
  if (checking) return <SessionLoadingState />;
  if (!allowed) return <ForbiddenState />;
  return <UsersContent />;
}

function UsersContent() {
  const theme = useTheme();
  const s = useStyles(factory);
  const { user } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, validate, clearErrors, applyApiError } =
    useFormValidation<FormState>();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.list();
      startTransition(() => setUsers(data));
    } catch (e) {
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar utilizadores.'),
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
    Alert.alert('Desativar utilizador', `Tem a certeza que quer desativar "${target.fullName}"?`, [
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
              e instanceof ApiError ? e.message : 'Erro ao desativar utilizador.',
            );
          }
        },
      },
    ]);
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

  const inactive = users.filter((u) => !u.isActive).length;
  const sections = ROLES.map((role) => ({
    role,
    items: users.filter((u) => u.role === role),
  })).filter((sec) => sec.items.length > 0);

  return (
    <>
      <ListScaffold
        testID="users.screen"
        horizon={{
          eyebrow: 'ADMINISTRAÇÃO',
          title: 'Utilizadores',
          meta:
            loading && users.length === 0
              ? 'A carregar…'
              : `${users.length === 1 ? '1 conta' : `${users.length} contas`}${
                  inactive ? ` · ${inactive === 1 ? '1 inativa' : `${inactive} inativas`}` : ''
                }`,
          aside: <Button testID="users.create" label="Novo utilizador" onPress={openCreate} />,
        }}
        refreshing={loading && users.length > 0}
        onRefresh={() => load()}
      >
        {error && !loading ? (
          <ErrorState message={error} onRetry={() => load()} />
        ) : loading && users.length === 0 ? (
          <ListGroup>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonRow key={i} index={i} last={i === 3} />
            ))}
          </ListGroup>
        ) : users.length === 0 ? (
          <ListGroup>
            <EmptyState
              align="start"
              icon="users-three"
              title="Ainda não há utilizadores"
              description="Crie a primeira conta com «Novo utilizador». A pessoa recebe um email para confirmar o endereço."
            />
          </ListGroup>
        ) : (
          <View style={s.sections}>
            {sections.map((sec) => (
              <View key={sec.role} style={s.section}>
                <Text variant="label" style={s.sectionLabel}>
                  {`${ROLE_SECTION[sec.role]} · ${sec.items.length}`}
                </Text>
                <ListGroup>
                  {sec.items.map((u, i) => (
                    <UserRow
                      key={u.id}
                      item={u}
                      isSelf={isSelf(u)}
                      last={i === sec.items.length - 1}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </ListGroup>
              </View>
            ))}
          </View>
        )}
      </ListScaffold>

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
              onChangeText={(text) => setForm((f) => ({ ...f, email: text }))}
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
              onChangeText={(text) => setForm((f) => ({ ...f, password: text }))}
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
          onChangeText={(text) => setForm((f) => ({ ...f, fullName: text }))}
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
          {ROLES.map((role) => (
            <Chip
              key={role}
              active={form.role === role}
              onPress={editingSelf ? undefined : () => setForm((f) => ({ ...f, role }))}
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
                onValueChange={(value) => setForm((f) => ({ ...f, isActive: value }))}
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
    </>
  );
}

const styles = StyleSheet.create({
  roleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  estadoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
