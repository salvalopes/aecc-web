import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useCompanyDirectory } from '@/hooks/useCompanyDirectory';
import type { CompanyDirectoryEntry } from '@/types/api';
import { Button, Card, IconButton, EmptyState, ErrorState, LoadingSpinner } from '@/components/ui';

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
          icon="caret-right"
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

interface CompanyDirectoryListProps {
  search: string;
  categoryId?: string;
  emptyMessage?: string;
}

export function CompanyDirectoryList({ search, categoryId, emptyMessage = 'Nenhuma empresa encontrada.' }: CompanyDirectoryListProps) {
  const { colors, fontFamily, fontSize, spacing } = useTheme();
  const { entries, loading, loadingMore, error, loadMore, reload } = useCompanyDirectory({ search, categoryId });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedIds(new Set());
  }, [search, categoryId]);

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading && entries.length === 0) return <LoadingSpinner />;
  if (error && entries.length === 0) return <ErrorState message={error} onRetry={reload} />;

  return (
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
      ListEmptyComponent={<EmptyState message={emptyMessage} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        loadingMore ? (
          <LoadingSpinner size="small" />
        ) : error && entries.length > 0 ? (
          <View style={{ padding: spacing[6], alignItems: 'center', gap: spacing[4] }}>
            <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.error }}>
              {error}
            </Text>
            <Button variant="secondary" size="sm" onPress={loadMore}>
              Tentar novamente
            </Button>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {},
  row: { overflow: 'hidden' },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  nameArea: { flex: 1 },
  chevron: { marginRight: 8 },
  details: { borderTopWidth: 1 },
});
