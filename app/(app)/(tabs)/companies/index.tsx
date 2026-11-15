import { useCallback, useEffect, useState, startTransition } from 'react';
import { Platform, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import type { Category } from '@/types/api';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useBreakpoint } from '@/theme/useBreakpoint';
import { useCompanyDirectory } from '@/hooks/useCompanyDirectory';
import { SearchField, SegmentedControl, Skeleton } from '@/components/ds';
import { ListScaffold } from '@/components/templates/ListScaffold';
import { CategoryChips } from '@/components/directory/CategoryChips';
import { CategorySidebar } from '@/components/directory/CategorySidebar';
import { DirectoryResults, type DirectoryView } from '@/components/directory/DirectoryResults';
import { categoryName, countLabel } from '@/components/directory/categories';

// T3 Lista — Diretório (direção Maré, fase2 §4 B).
// sm: horizonte com o lockup → pesquisa em vidro a −26 → chips → lista agrupada.
// md: horizonte com o título à esquerda e a pesquisa à direita → chips → linhas de 64.
// lg: + sidebar de categorias (1fr) e, no web, o alternador Lista | Tabela.
// `categoryId`/`search` chegam por query param (Início, /companies/category/:id).
const factory = createStyles(({ spacing, layout }) => ({
  search: { width: '100%', maxWidth: layout.formMaxWidth + spacing['6xl'] },
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end' },
}));

const VIEWS = [
  { value: 'list', label: 'Lista', icon: 'list', testID: 'companies.view-list' },
  { value: 'table', label: 'Tabela', icon: 'table', testID: 'companies.view-table' },
] as const;

export default function CompaniesScreen() {
  const params = useLocalSearchParams<{ categoryId?: string; search?: string }>();
  const s = useStyles(factory);
  const { breakpoint, isWide } = useBreakpoint();

  const [search, setSearch] = useState(params.search ?? '');
  const [categoryId, setCategoryId] = useState(params.categoryId ?? '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [view, setView] = useState<DirectoryView>('list');

  const directory = useCompanyDirectory({ search, categoryId: categoryId || undefined });
  // Só o gesto de puxar mostra o indicador nativo (não cada pesquisa).
  const [pulling, setPulling] = useState(false);
  useEffect(() => {
    if (!directory.loading) setPulling(false);
  }, [directory.loading]);

  const loadCategories = useCallback(() => {
    categoriesApi
      .list()
      .then((data) => startTransition(() => setCategories(data)))
      .catch((e) => {
        // Silenciosa: as categorias são um filtro opcional; a lista tem o seu próprio erro/retry.
        if (!(e instanceof ApiError)) throw e;
      });
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const lg = breakpoint === 'lg';
  const tableAvailable = lg && Platform.OS === 'web';
  const activeView: DirectoryView = tableAvailable ? view : 'list';
  const category = categoryName(categories, categoryId);

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
  };

  const searchField = (
    <View style={isWide ? s.search : null}>
      <SearchField
        testID="companies.search"
        value={search}
        onChangeText={setSearch}
        placeholder="Nome ou marca da empresa"
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );

  const meta =
    directory.totalCount === null ? (
      <Skeleton width={160} height={13} />
    ) : (
      countLabel(directory.totalCount, { query: search, category })
    );

  const toolbar = lg ? (
    tableAvailable ? (
      <View style={s.toolbar}>
        <SegmentedControl
          accessibilityLabel="Vista"
          options={VIEWS}
          value={view}
          onChange={setView}
        />
      </View>
    ) : null
  ) : (
    <CategoryChips
      categories={categories}
      value={categoryId}
      onChange={setCategoryId}
      wide={isWide}
    />
  );

  return (
    <ListScaffold
      testID="companies.screen"
      horizon={{
        title: 'Quem faz Cascais.',
        meta,
        brand: true,
        aside: isWide ? searchField : undefined,
      }}
      overlap={searchField}
      sidebar={
        lg ? (
          <CategorySidebar categories={categories} value={categoryId} onChange={setCategoryId} />
        ) : undefined
      }
      toolbar={toolbar}
      refreshing={pulling}
      onRefresh={() => {
        setPulling(true);
        directory.reload();
        loadCategories();
      }}
      onEndReached={directory.hasMore ? directory.loadMore : undefined}
    >
      <DirectoryResults
        entries={directory.entries}
        loading={directory.loading}
        loadingMore={directory.loadingMore}
        error={directory.error}
        query={search}
        category={category}
        onClearFilters={clearFilters}
        onRetry={directory.reload}
        onLoadMore={directory.loadMore}
        view={activeView}
        wide={isWide}
      />
    </ListScaffold>
  );
}
