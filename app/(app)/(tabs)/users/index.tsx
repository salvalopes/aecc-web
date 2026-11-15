import { View } from 'react-native';
import { useCallback, useRef, useState, startTransition } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/api/users.api';
import { ApiError } from '@/api/client';
import { confirmDestructive } from '@/utils/confirm';
import type { ManagedUser, UserRole } from '@/types/api';
import { createStyles, useStyles } from '@/theme/createStyles';
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  InlineAlert,
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
  const s = useStyles(factory);
  const { user } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1.ª vez com esqueleto; ao voltar de um formulário T7 (novo/editar), em silêncio.
  async function load(silent = false) {
    if (!silent) setLoading(true);
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

  const loaded = useRef(false);
  useFocusEffect(
    useCallback(() => {
      load(loaded.current);
      loaded.current = true;
    }, []),
  );

  function isSelf(u: ManagedUser) {
    return !!user && u.id === user.id;
  }

  async function handleDeactivate(target: ManagedUser) {
    const confirmed = await confirmDestructive({
      title: 'Desativar utilizador',
      message: `"${target.fullName}" deixa de conseguir entrar na app. Pode reativar a conta em Editar.`,
      confirmLabel: 'Desativar',
    });
    if (!confirmed) return;
    setActionError(null);
    try {
      await usersApi.delete(target.id);
      load(true);
    } catch (e) {
      setActionError(
        e instanceof ApiError ? e.message : 'Não foi possível desativar o utilizador.',
      );
    }
  }

  const inactive = users.filter((u) => !u.isActive).length;
  const sections = ROLES.map((role) => ({
    role,
    items: users.filter((u) => u.role === role),
  })).filter((sec) => sec.items.length > 0);

  return (
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
        aside: (
          <Button
            testID="users.create"
            label="Novo utilizador"
            onPress={() => router.push('/users/new')}
          />
        ),
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
          {actionError ? (
            <InlineAlert tone="error" message={actionError} testID="users.action-error" />
          ) : null}
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
                    onEdit={(u) => router.push(`/users/${u.id}/edit`)}
                    onDelete={handleDeactivate}
                  />
                ))}
              </ListGroup>
            </View>
          ))}
        </View>
      )}
    </ListScaffold>
  );
}
