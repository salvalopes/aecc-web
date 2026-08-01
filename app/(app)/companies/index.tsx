import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useCallback, useEffect, useState, startTransition } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import type { Category } from '@/types/api';
import { Card, Icon, Input, EmptyState, ErrorState, LoadingSpinner } from '@/components/ui';
import { CompanyDirectoryList } from '@/components/CompanyDirectoryList';
import { categoryIcon } from '@/utils/categoryIcons';

function CategoryCard({ category, width }: { category: Category; width: number }) {
  const { colors, fontFamily, fontSize, fontWeight, spacing } = useTheme();

  return (
    <Card
      interactive
      onPress={() =>
        router.push({
          pathname: '/(app)/companies/category/[categoryId]',
          params: { categoryId: category.id, name: category.name },
        })
      }
      style={{ width, alignItems: 'center', gap: spacing[3], paddingVertical: spacing[6] }}
    >
      <Icon name={categoryIcon(category.slug)} size={28} color={colors.accentPrimary} />
      <Text
        style={{
          fontFamily: fontFamily.body,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          color: colors.textPrimary,
          textAlign: 'center',
        }}
      >
        {category.name}
      </Text>
    </Card>
  );
}

export default function CompaniesScreen() {
  const { colors, spacing } = useTheme();
  const { width } = useWindowDimensions();

  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(() => {
    setLoading(true);
    setError(null);
    categoriesApi
      .list()
      .then(data => startTransition(() => setCategories(data)))
      .catch(e =>
        startTransition(() => setError(e instanceof ApiError ? e.message : 'Erro ao carregar categorias.'))
      )
      .finally(() => startTransition(() => setLoading(false)));
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const trimmedSearch = search.trim();
  const gridPadding = spacing[6];
  const cardGap = spacing[5];
  const numColumns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const cardWidth = (Math.min(width, 1100) - gridPadding * 2 - cardGap * (numColumns - 1)) / numColumns;

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

      {trimmedSearch.length > 0 ? (
        <CompanyDirectoryList search={trimmedSearch} />
      ) : loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={loadCategories} />
      ) : (
        <FlatList
          data={categories}
          key={numColumns}
          numColumns={numColumns}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <CategoryCard category={item} width={cardWidth} />}
          contentContainerStyle={{ padding: gridPadding, gap: cardGap }}
          columnWrapperStyle={numColumns > 1 ? { gap: cardGap } : undefined}
          ListEmptyComponent={<EmptyState message="Nenhuma categoria encontrada." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { borderBottomWidth: 1 },
});
