import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useCallback, useEffect, useState, startTransition } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import type { Category } from '@/types/api';
import { Chip, Icon } from '@/components/ui';
import { CompanyDirectoryList } from '@/components/CompanyDirectoryList';

// Diretório único e pesquisável, com chips de categoria e expansão inline por
// linha — substitui a antiga grelha de categorias em 2 passos. `categoryId`/
// `search` chegam por query param quando se navega a partir do Início ou de
// um link antigo para /companies/category/[categoryId].
export default function CompaniesScreen() {
  const params = useLocalSearchParams<{ categoryId?: string; name?: string; search?: string }>();
  const { colors, glass, glassRadius, fontFamily, fontSize } = useTheme();

  const [search, setSearch] = useState(params.search ?? '');
  const [categoryId, setCategoryId] = useState(params.categoryId ?? '');
  const [categories, setCategories] = useState<Category[]>([]);

  const loadCategories = useCallback(() => {
    categoriesApi
      .list()
      .then(data => startTransition(() => setCategories(data)))
      .catch(e => {
        // Silenciosa — os chips de categoria são um filtro opcional; a lista
        // de empresas em baixo tem o seu próprio ErrorState/retry.
        if (!(e instanceof ApiError)) throw e;
      });
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceApp }]}>
      <View style={[styles.header, { backgroundColor: colors.surfaceCard, borderBottomColor: colors.borderSubtle }]}>
        <View
          style={[
            styles.searchBar,
            { borderRadius: glassRadius.control, borderColor: glass.neutral.border, backgroundColor: glass.neutral.tint },
          ]}
        >
          <Icon name="magnifying-glass" size={18} color={colors.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar empresas..."
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, minWidth: 0, fontFamily: fontFamily.body, fontSize: fontSize.md, color: colors.textPrimary }}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip active={!categoryId} onPress={() => setCategoryId('')}>
            Todas
          </Chip>
          {categories.map(c => (
            <Chip key={c.id} active={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? '' : c.id)}>
              {c.name}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <CompanyDirectoryList search={search} categoryId={categoryId || undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, padding: 12, gap: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, paddingHorizontal: 14, borderWidth: 1 },
  chipRow: { flexDirection: 'row', gap: 7, paddingBottom: 2 },
});
