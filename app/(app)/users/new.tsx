import { useState } from 'react';
import { usersApi } from '@/api/users.api';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { combine, emailFormat, passwordStrength, required } from '@/utils/validators';
import { closeForm } from '@/navigation/closeForm';
import { FormLayout } from '@/components/templates/FormLayout';
import { ForbiddenState, SessionLoadingState } from '@/components/templates/StateTemplates';
import {
  EMPTY_USER_FORM,
  UserFields,
  userApiFields,
  type UserFormState,
} from '@/components/forms/UserFields';

// T7 (B12): "Novo utilizador" (`/users/new`), aberto a partir de "Utilizadores". Substitui o `Modal`.
export default function NewUserScreen() {
  const { allowed, checking } = useRequireRole(['Admin']);
  if (checking) return <SessionLoadingState />;
  if (!allowed) return <ForbiddenState />;
  return <NewUserForm />;
}

function NewUserForm() {
  const [form, setForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, validate, applyApiError } = useFormValidation<UserFormState>();

  async function handleSave() {
    const valid = validate(form, {
      email: combine(required('O email é obrigatório.'), emailFormat()),
      password: passwordStrength(),
      fullName: required('O nome é obrigatório.'),
    });
    if (!valid) return;
    setSaving(true);
    try {
      await usersApi.create({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        role: form.role,
      });
      closeForm('/users');
    } catch (e) {
      applyApiError(e, userApiFields);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormLayout
      testIDPrefix="user-create"
      submitLabel="Criar conta"
      onSubmit={handleSave}
      onCancel={() => closeForm('/users')}
      submitting={saving}
      error={formError}
    >
      <UserFields
        mode="create"
        testIDPrefix="user-create"
        value={form}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        errors={fieldErrors}
      />
    </FormLayout>
  );
}
