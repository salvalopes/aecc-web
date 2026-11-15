import { useEffect, useState, startTransition } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { usersApi } from '@/api/users.api';
import { ApiError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { required } from '@/utils/validators';
import { closeForm } from '@/navigation/closeForm';
import type { ManagedUser } from '@/types/api';
import { ErrorState, StateScreen } from '@/components/ui';
import { DetailScaffold } from '@/components/templates/DetailScaffold';
import { FormLayout } from '@/components/templates/FormLayout';
import { ForbiddenState, SessionLoadingState } from '@/components/templates/StateTemplates';
import {
  EMPTY_USER_FORM,
  UserFields,
  userApiFields,
  type UserFormState,
} from '@/components/forms/UserFields';

// T7 (B12): "Editar utilizador" (`/users/:id/edit`), aberto a partir de "Utilizadores".
// Substitui o `Modal`.
export default function EditUserScreen() {
  const { allowed, checking } = useRequireRole(['Admin']);
  if (checking) return <SessionLoadingState />;
  if (!allowed) return <ForbiddenState />;
  return <EditUserForm />;
}

function EditUserForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [target, setTarget] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, validate, applyApiError } = useFormValidation<UserFormState>();

  async function load() {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const found = await usersApi.get(id);
      startTransition(() => {
        setTarget(found);
        setForm({
          email: found.email,
          password: '',
          fullName: found.fullName,
          role: found.role,
          isActive: found.isActive,
        });
      });
    } catch (e) {
      startTransition(() => {
        setNotFound(e instanceof ApiError && e.status === 404);
        setLoadError(e instanceof ApiError ? e.message : 'Não foi possível carregar a conta.');
      });
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave() {
    if (!target || !validate(form, { fullName: required('O nome é obrigatório.') })) return;
    setSaving(true);
    try {
      await usersApi.update(target.id, {
        fullName: form.fullName.trim(),
        role: form.role,
        isActive: form.isActive,
      });
      closeForm('/users');
    } catch (e) {
      applyApiError(e, userApiFields);
    } finally {
      setSaving(false);
    }
  }

  if (!loading && !target) {
    if (!notFound) {
      return (
        <DetailScaffold>
          <ErrorState
            testID="user-edit.error"
            message={loadError ?? 'Não foi possível carregar a conta.'}
            onRetry={load}
          />
        </DetailScaffold>
      );
    }
    return (
      <StateScreen
        testID="user-edit.not-found"
        icon="magnifying-glass"
        title="Conta não encontrada"
        description="A conta pode ter sido removida ou o endereço está errado."
        actionLabel="Ver os utilizadores"
        onAction={() => router.replace('/users')}
      />
    );
  }

  return (
    <FormLayout
      testIDPrefix="user-edit"
      onSubmit={handleSave}
      onCancel={() => closeForm('/users')}
      submitting={saving}
      error={formError}
      loading={loading && !target}
    >
      <UserFields
        mode="edit"
        testIDPrefix="user-edit"
        value={form}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        errors={fieldErrors}
        self={!!user && target?.id === user.id}
      />
    </FormLayout>
  );
}
