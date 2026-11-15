import { useCallback, useEffect, useState, startTransition } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { categoriesApi } from '@/api/categories.api';
import { companiesApi } from '@/api/companies.api';
import { ApiError } from '@/api/client';
import type { Category, CompanyDirectoryEntry } from '@/types/api';
import { useAuth } from '@/hooks/useAuth';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useBreakpoint } from '@/theme/useBreakpoint';
import { ErrorState, SearchField, Skeleton } from '@/components/ui';
import { ListScaffold } from '@/components/templates/ListScaffold';
import { countLabel } from '@/components/directory/categories';
import {
  CategoryList,
  CategoryListSkeleton,
  CompanyPreview,
  CompanyPreviewSkeleton,
  HomeSection,
} from '@/components/home/HomeSections';

// T5 Início (B13), direção Maré (fase2 §4 B).
// sm: horizonte com o lockup e a saudação → pesquisa em vidro a −26 → categorias → empresas.
// md+: pesquisa à direita no horizonte; categorias (2fr) e empresas (3fr) lado a lado.
// A pesquisa e as categorias abrem o diretório já filtrado (`/companies?search=|categoryId=`).
const PREVIEW = 5;

const factory = createStyles(({ spacing, layout }) => ({
  search: { width: '100%', maxWidth: layout.formMaxWidth + spacing['6xl'] },
  stack: { gap: layout.sectionGap },
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['4xl'] },
  categories: { flex: 2, minWidth: spacing[0] },
  companies: { flex: 3, minWidth: spacing[0] },
}));

interface HomeData {
  categories: Category[];
  companies: CompanyDirectoryEntry[];
  totalCount: number;
}

function firstName(fullName: string | undefined) {
  return fullName?.trim().split(/\s+/)[0] ?? '';
}

export default function HomeScreen() {
  const s = useStyles(factory);
  const { user } = useAuth();
  const { isWide } = useBreakpoint();

  const [search, setSearch] = useState('');
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([categoriesApi.list(), companiesApi.directory({ pageSize: PREVIEW })])
      .then(([categories, page]) =>
        startTransition(() =>
          setData({
            categories: categories.filter((c) => !c.parentId),
            companies: page.items,
            totalCount: page.totalCount,
          }),
        ),
      )
      .catch((e) =>
        startTransition(() =>
          setError(e instanceof ApiError ? e.message : 'Não foi possível carregar o Início.'),
        ),
      )
      .finally(() =>
        startTransition(() => {
          setLoading(false);
          setRefreshing(false);
        }),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitSearch = () => {
    const term = search.trim();
    router.push({ pathname: '/companies', params: term ? { search: term } : {} });
  };

  const searchField = (
    <View style={isWide ? s.search : null}>
      <SearchField
        testID="home.search"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={submitSearch}
        placeholder="Nome ou marca da empresa"
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="off"
      />
    </View>
  );

  const name = firstName(user?.fullName);
  const meta = data ? (
    countLabel(data.totalCount, { query: '', category: null })
  ) : error ? undefined : (
    <Skeleton width={160} height={13} />
  );
  const density = isWide ? 'compact' : 'regular';

  const categories =
    loading && !data ? (
      <CategoryListSkeleton />
    ) : data && data.categories.length > 0 ? (
      <CategoryList categories={data.categories} density={density} />
    ) : null;

  const companies =
    loading && !data ? (
      <CompanyPreviewSkeleton />
    ) : data ? (
      <CompanyPreview companies={data.companies} totalCount={data.totalCount} density={density} />
    ) : null;

  const sections = (
    <View style={isWide ? s.split : s.stack}>
      {categories ? (
        <View style={isWide ? s.categories : null}>
          <HomeSection label="CATEGORIAS" meta={data ? String(data.categories.length) : undefined}>
            {categories}
          </HomeSection>
        </View>
      ) : null}
      {companies ? (
        <View style={isWide ? s.companies : null}>
          <HomeSection label="NO DIRETÓRIO">{companies}</HomeSection>
        </View>
      ) : null}
    </View>
  );

  return (
    <ListScaffold
      testID="home.screen"
      horizon={{
        title: name ? `Olá, ${name}.` : 'Olá.',
        meta,
        brand: true,
        aside: isWide ? searchField : undefined,
      }}
      overlap={searchField}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
    >
      {error && !data ? (
        <ErrorState testID="home.error" message={error} onRetry={load} />
      ) : (
        sections
      )}
    </ListScaffold>
  );
}
