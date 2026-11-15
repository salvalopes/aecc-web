import { useEffect, useState, startTransition } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { productsApi } from '@/api/products.api';
import { companiesApi } from '@/api/companies.api';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useFormValidation } from '@/hooks/useFormValidation';
import { closeForm } from '@/navigation/closeForm';
import type { Category, Company } from '@/types/api';
import { ErrorState, StateScreen } from '@/components/ds';
import { DetailScaffold } from '@/components/templates/DetailScaffold';
import { FormLayout } from '@/components/templates/FormLayout';
import { ForbiddenState } from '@/components/templates/StateTemplates';
import {
  EMPTY_PRODUCT_FORM,
  ProductFields,
  productApiFields,
  productPayload,
  productRules,
  type ProductFormState,
} from '@/components/forms/ProductFields';

// T7 (B12): "Novo produto" (`/products/new?companyId=`), aberto na secção de produtos do
// detalhe da empresa. Substitui o `Modal`. As imagens adicionam-se depois, em "Editar".
export default function NewProductScreen() {
  const { companyId } = useLocalSearchParams<{ companyId?: string }>();
  const { user } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, validate, applyApiError } = useFormValidation<ProductFormState>();

  async function load() {
    if (!companyId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const [co, cats] = await Promise.all([companiesApi.get(companyId), categoriesApi.list()]);
      startTransition(() => {
        setCompany(co);
        setCategories(cats);
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
  }, [companyId]);

  const back = companyId ? (`/companies/${companyId}` as const) : ('/my-companies' as const);

  async function handleSave() {
    if (!company || !validate(form, productRules)) return;
    setSaving(true);
    try {
      await productsApi.create({ companyId: company.id, ...productPayload(form) });
      closeForm(back);
    } catch (e) {
      applyApiError(e, productApiFields);
    } finally {
      setSaving(false);
    }
  }

  if (!loading && !company) {
    if (notFound) {
      return (
        <StateScreen
          testID="product-create.not-found"
          icon="magnifying-glass"
          title="Empresa não encontrada"
          description="Abra «Novo produto» a partir da página da sua empresa."
          actionLabel="Ver as minhas empresas"
          onAction={() => router.replace('/my-companies')}
        />
      );
    }
    return (
      <DetailScaffold>
        <ErrorState
          testID="product-create.error"
          message={loadError ?? 'Não foi possível carregar a empresa.'}
          onRetry={load}
        />
      </DetailScaffold>
    );
  }

  if (company && user && company.ownerUserId !== user.id) return <ForbiddenState />;

  return (
    <FormLayout
      testIDPrefix="product-create"
      submitLabel="Publicar"
      onSubmit={handleSave}
      onCancel={() => closeForm(back)}
      submitting={saving}
      error={formError}
      loading={loading && !company}
    >
      <ProductFields
        testIDPrefix="product-create"
        value={form}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        errors={fieldErrors}
        categories={categories}
      />
    </FormLayout>
  );
}
