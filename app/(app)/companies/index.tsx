import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef, useState, startTransition } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { companiesApi } from '@/api/companies.api';
import { ApiError } from '@/api/client';
import type { CompanyDirectoryEntry } from '@/types/api';
import { Button, Input, Card, IconButton, EmptyState, ErrorState, LoadingSpinner } from '@/components/ui';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

function buildAddressLine(item: CompanyDirectoryEntry): string | null {
  const parts = [item.address, item.postalCode, item.postalCodeLocality ?? item.locality].filter(
    (part): part is string => !!part && part.trim().length > 0
  );
  return parts.length > 0 ? parts.join(', ') : null;
}

function CompanyDirectoryRow({
  item,
  expanded,
  onToggle,
}: {
  item: CompanyDirectoryEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { colors, fontFamily, fontSize, fontWeight, spacing } = useTheme();

  const fields = [
    { label: 'Telefone', value: item.phone },
    { label: 'Email', value: item.contactEmail },
    { label: 'Morada', value: buildAddressLine(item) },
    { label: 'Atividade', value: item.caeDescription },
  ].filter((f): f is { label: string; value: string } => !!f.value);

  return (
    <Card padding={0} style={styles.row}>
      <View style={styles.rowHeader}>
        <Pressable
          onPress={() => router.push(`/(app)/companies/${item.id}`)}
          style={[styles.nameArea, { padding: spacing[6] }]}
        >
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize.md,
              fontWeight: fontWeight.bold,
              color: colors.textPrimary,
            }}
          >
            {item.name}
          </Text>
          {!!item.tradeName && (
            <Text
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                color: colors.textSecondary,
                marginTop: spacing[1],
              }}
            >
              {item.tradeName}
            </Text>
          )}
        </Pressable>
        <IconButton
          icon="chevron-right"
          label={expanded ? 'Colapsar detalhes' : 'Expandir detalhes'}
          onPress={onToggle}
          style={[styles.chevron, { transform: [{ rotate: expanded ? '90deg' : '0deg' }] }]}
        />
      </View>

      {expanded && (
        <View
          style={[
            styles.details,
            { borderTopColor: colors.borderSubtle, padding: spacing[6], gap: spacing[3] },
          ]}
        >
          {fields.length > 0 ? (
            fields.map(f => (
              <Text
                key={f.label}
                style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary }}
              >
                <Text style={{ fontWeight: fontWeight.semibold, color: colors.textPrimary }}>{f.label}: </Text>
                {f.value}
              </Text>
            ))
          ) : (
            <Text
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                color: colors.textTertiary,
                fontStyle: 'italic',
              }}
            >
              Sem contactos disponíveis.
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}

export default function CompaniesScreen() {
  const { colors, fontFamily, fontSize, spacing } = useTheme();

  const [entries, setEntries] = useState<CompanyDirectoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const requestIdRef = useRef(0);
  const isFirstRunRef = useRef(true);

  async function loadPage(pageToLoad: number, name: string, replace: boolean) {
    const requestId = ++requestIdRef.current;
    if (replace) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    try {
      const result = await companiesApi.directory({
        page: pageToLoad,
        pageSize: PAGE_SIZE,
        name: name || undefined,
      });
      if (requestId !== requestIdRef.current) return;
      startTransition(() => {
        setEntries(prev => (replace ? result.items : [...prev, ...result.items]));
        setPage(result.page);
        setTotalPages(result.totalPages);
        if (replace) setExpandedIds(new Set());
      });
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      startTransition(() =>
        setError(e instanceof ApiError ? e.message : 'Erro ao carregar empresas.')
      );
    } finally {
      if (requestId === requestIdRef.current) {
        startTransition(() => {
          setLoading(false);
          setLoadingMore(false);
        });
      }
    }
  }

  useEffect(() => {
    const name = search.trim();
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      loadPage(1, name, true);
      return;
    }
    const handle = setTimeout(() => {
      loadPage(1, name, true);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleEndReached() {
    if (loading || loadingMore) return;
    if (page >= totalPages) return;
    loadPage(page + 1, search.trim(), false);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceApp }]}>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.surfaceCard, borderBottomColor: colors.borderSubtle, padding: spacing[6] },
        ]}
      >
        <Input value={search} onChangeText={setSearch} placeholder="Pesquisar empresas..." />
      </View>

      {loading && entries.length === 0 ? (
        <LoadingSpinner />
      ) : error && entries.length === 0 ? (
        <ErrorState message={error} onRetry={() => loadPage(1, search.trim(), true)} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CompanyDirectoryRow
              item={item}
              expanded={expandedIds.has(item.id)}
              onToggle={() => toggleExpand(item.id)}
            />
          )}
          contentContainerStyle={[styles.list, { padding: spacing[6], gap: spacing[5] }]}
          ListEmptyComponent={<EmptyState message="Nenhuma empresa encontrada." />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <LoadingSpinner size="small" />
            ) : error && entries.length > 0 ? (
              <View style={{ padding: spacing[6], alignItems: 'center', gap: spacing[4] }}>
                <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.error }}>
                  {error}
                </Text>
                <Button variant="secondary" size="sm" onPress={() => loadPage(page + 1, search.trim(), false)}>
                  Tentar novamente
                </Button>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { borderBottomWidth: 1 },
  list: {},
  row: { overflow: 'hidden' },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  nameArea: { flex: 1 },
  chevron: { marginRight: 8 },
  details: { borderTopWidth: 1 },
});
