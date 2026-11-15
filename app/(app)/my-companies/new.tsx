import { useState } from 'react';
import { companiesApi } from '@/api/companies.api';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useRequireRole } from '@/hooks/useRequireRole';
import { closeForm } from '@/navigation/closeForm';
import { FormLayout } from '@/components/templates/FormLayout';
import { ForbiddenState, SessionLoadingState } from '@/components/templates/StateTemplates';
import {
  CompanyFields,
  EMPTY_COMPANY_FORM,
  companyApiFields,
  companyPayload,
  companyRules,
  type CompanyFormState,
} from '@/components/forms/CompanyFields';

// T7 (B12): "Nova empresa", aberta a partir de "As minhas empresas". Substitui o `Modal`.
export default function NewCompanyScreen() {
  const { allowed, checking } = useRequireRole(['Associado', 'Admin']);
  if (checking) return <SessionLoadingState />;
  if (!allowed) return <ForbiddenState />;
  return <NewCompanyForm />;
}

function NewCompanyForm() {
  const [form, setForm] = useState<CompanyFormState>(EMPTY_COMPANY_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, validate, applyApiError } = useFormValidation<CompanyFormState>();

  async function handleSave() {
    if (!validate(form, companyRules)) return;
    setSaving(true);
    try {
      await companiesApi.create(companyPayload(form));
      closeForm('/my-companies');
    } catch (e) {
      applyApiError(e, companyApiFields);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormLayout
      testIDPrefix="company-create"
      submitLabel="Criar empresa"
      onSubmit={handleSave}
      onCancel={() => closeForm('/my-companies')}
      submitting={saving}
      error={formError}
    >
      <CompanyFields
        testIDPrefix="company-create"
        value={form}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        errors={fieldErrors}
      />
    </FormLayout>
  );
}
