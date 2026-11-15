import { useEffect, useState, startTransition } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { companiesApi } from '@/api/companies.api';
import { ApiError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useFormValidation } from '@/hooks/useFormValidation';
import { closeForm } from '@/navigation/closeForm';
import type { Company } from '@/types/api';
import { ErrorState, StateScreen } from '@/components/ds';
import { DetailScaffold } from '@/components/templates/DetailScaffold';
import { FormLayout } from '@/components/templates/FormLayout';
import { ForbiddenState } from '@/components/templates/StateTemplates';
import {
  CompanyFields,
  EMPTY_COMPANY_FORM,
  companyApiFields,
  companyPayload,
  companyRules,
  type CompanyFormState,
} from '@/components/forms/CompanyFields';

// T7 (B12): "Editar empresa". Abre-se do detalhe da empresa e de "As minhas empresas"
// (`/my-companies/:id/edit`); substitui o `Modal` e o antigo `?edit=1`. Só o dono edita.
export default function EditCompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState<CompanyFormState>(EMPTY_COMPANY_FORM);
  const [logo, setLogo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, validate, applyApiError } = useFormValidation<CompanyFormState>();

  async function load() {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const co = await companiesApi.get(id);
      startTransition(() => {
        setCompany(co);
        setForm({
          name: co.name,
          description: co.description,
          leadCooldownMinutes: String(co.leadCooldownMinutes),
          leadDestinationEmail: co.leadDestinationEmail,
        });
      });
    } catch (e) {
      startTransition(() => {
        setNotFound(e instanceof ApiError && e.status === 404);
        setLoadError(e instanceof ApiError ? e.message : 'Não foi possível carregar a empresa.');
      });
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function pickLogo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      startTransition(() => setLogo(asset));
    }
  }

  async function handleSave() {
    if (!id || !validate(form, companyRules)) return;
    setSaving(true);
    try {
      await companiesApi.update(id, companyPayload(form));
      if (logo) await companiesApi.uploadLogo(id, logo);
      closeForm(`/companies/${id}`);
    } catch (e) {
      applyApiError(e, companyApiFields);
    } finally {
      setSaving(false);
    }
  }

  if (!loading && !company) {
    if (notFound) {
      return (
        <StateScreen
          testID="company-edit.not-found"
          icon="magnifying-glass"
          title="Empresa não encontrada"
          description="A empresa pode ter saído do diretório ou o endereço está errado."
          actionLabel="Ver as minhas empresas"
          onAction={() => router.replace('/my-companies')}
        />
      );
    }
    return (
      <DetailScaffold>
        <ErrorState
          testID="company-edit.error"
          message={loadError ?? 'Não foi possível carregar a empresa.'}
          onRetry={load}
        />
      </DetailScaffold>
    );
  }

  if (company && user && company.ownerUserId !== user.id) return <ForbiddenState />;

  return (
    <FormLayout
      testIDPrefix="company-edit"
      onSubmit={handleSave}
      onCancel={() => closeForm(`/companies/${id}`)}
      submitting={saving}
      error={formError}
      loading={loading && !company}
    >
      <CompanyFields
        testIDPrefix="company-edit"
        value={form}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        errors={fieldErrors}
        logo={{ uri: logo?.uri ?? company?.logoUrl ?? null, onPick: pickLogo }}
      />
    </FormLayout>
  );
}
