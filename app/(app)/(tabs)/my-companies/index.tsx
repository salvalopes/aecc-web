import { useCallback, useRef, useState, startTransition } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { companiesApi } from '@/api/companies.api';
import { ApiError } from '@/api/client';
import type { Company } from '@/types/api';
import {
  Button,
  CompanyRow,
  EmptyState,
  ErrorState,
  ListGroup,
  SkeletonRow,
} from '@/components/ds';
import { ListScaffold } from '@/components/templates/ListScaffold';
import { useRequireRole } from '@/hooks/useRequireRole';
import { ForbiddenState, SessionLoadingState } from '@/components/templates/StateTemplates';

function MyCompanyRow({ company, last }: { company: Company; last: boolean }) {
  return (
    <CompanyRow
      testID="my-companies.card"
      company={company}
      last={last}
      onPress={() => router.push(`/companies/${company.id}`)}
      actions={
        <Button
          testID="my-companies.edit"
          label="Editar"
          variant="secondary"
          size="sm"
          onPress={() => router.push(`/my-companies/${company.id}/edit`)}
        />
      }
    />
  );
}

export default function MyCompaniesScreen() {
  // O papel decide antes de montar o conteúdo (e os seus efeitos de dados).
  const { allowed, checking } = useRequireRole(['Associado', 'Admin']);
  if (checking) return <SessionLoadingState />;
  if (!allowed) return <ForbiddenState />;
  return <MyCompaniesContent />;
}

function MyCompaniesContent() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1.ª vez com esqueleto; ao voltar de um formulário T7 (nova/editar), em silêncio.
  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await companiesApi.getMine();
      startTransition(() => setCompanies(data));
    } catch (e) {
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar as suas empresas.'),
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

  const count = companies.length;
  return (
    <ListScaffold
      testID="my-companies.screen"
      horizon={{
        eyebrow: 'ÁREA DO ASSOCIADO',
        title: 'As minhas empresas',
        meta:
          loading && count === 0
            ? 'A carregar…'
            : count === 0
              ? 'Nenhuma empresa no diretório'
              : count === 1
                ? '1 empresa no diretório'
                : `${count} empresas no diretório`,
        aside: (
          <Button
            testID="my-companies.create"
            label="Nova empresa"
            onPress={() => router.push('/my-companies/new')}
          />
        ),
      }}
      refreshing={loading && count > 0}
      onRefresh={() => load()}
    >
      {error && count === 0 && !loading ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <ListGroup>
          {loading && count === 0
            ? [0, 1, 2].map((i) => <SkeletonRow key={i} index={i} last={i === 2} />)
            : null}
          {!loading && count === 0 ? (
            <EmptyState
              align="start"
              icon="storefront"
              title="Ainda não tem empresas"
              description="Crie a ficha da sua empresa para aparecer no diretório da AECC e receber pedidos de contacto dos associados."
            />
          ) : null}
          {companies.map((c, i) => (
            <MyCompanyRow key={c.id} company={c} last={i === count - 1} />
          ))}
        </ListGroup>
      )}
    </ListScaffold>
  );
}
