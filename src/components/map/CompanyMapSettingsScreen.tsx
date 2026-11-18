import { Suspense, lazy, useCallback, useEffect, useState, startTransition } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { companiesApi } from '@/api/companies.api';
import { ApiError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import type { Company } from '@/types/api';
import { ErrorState, StateScreen } from '@/components/ui';
import { DetailScaffold } from '@/components/templates/DetailScaffold';
import { ForbiddenState, SessionLoadingState } from '@/components/templates/StateTemplates';
// O mesmo import() do "Editar empresa": a secção fica num só chunk (se fosse estática aqui e lazy
// lá, o Metro punha-a no __common que o index.html carrega logo; regra 4).
const MapSettingsSection = lazy(() =>
  import('@/components/forms/MapSettingsSection').then((m) => ({ default: m.MapSettingsSection })),
);

// T7 "Visibilidade no mapa" (mapa-plano W6). Para o Admin (esconder do mapa) e para o dono
// (os mesmos botões da secção MAPA do "Editar empresa"). Outros papéis: sem permissão, e a
// secção nem chega a pedir as definições (regra 8; a API responderia 403).
export default function CompanyMapSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const data = await companiesApi.get(id);
      startTransition(() => setCompany(data));
    } catch (e) {
      startTransition(() => {
        setNotFound(e instanceof ApiError && e.status === 404);
        setError(e instanceof ApiError ? e.message : 'Não foi possível carregar a empresa.');
      });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return <SessionLoadingState />;
  if (notFound) {
    return (
      <StateScreen
        testID="company-map.not-found"
        icon="magnifying-glass"
        title="Empresa não encontrada"
      />
    );
  }
  if (error) {
    return (
      <DetailScaffold>
        <ErrorState testID="company-map.error" message={error} onRetry={load} />
      </DetailScaffold>
    );
  }
  if (!company) return <SessionLoadingState />;

  const owner = company.ownerUserId === user.id;
  const admin = user.role === 'Admin';
  if (!owner && !admin) return <ForbiddenState />;

  return (
    <DetailScaffold testID="company-map.screen">
      <Suspense fallback={null}>
        <MapSettingsSection companyId={company.id} owner={owner} admin={admin} />
      </Suspense>
    </DetailScaffold>
  );
}
