import { StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { CompanyDirectoryList } from '@/components/CompanyDirectoryList';
import { Chip, IconButton, Input } from '@/components/ui';

export default function CompanyDirectoryByCategoryScreen() {
  const { categoryId, name } = useLocalSearchParams<{ categoryId: string; name?: string }>();
  const { colors, spacing } = useTheme();
  const [search, setSearch] = useState('');

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceApp }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surfaceCard, borderBottomColor: colors.borderSubtle, padding: spacing[6], gap: spacing[4] },
        ]}
      >
        <View style={styles.headerRow}>
          <IconButton icon="chevron-left" label="Voltar às categorias" onPress={() => router.back()} />
          {!!name && <Chip active>{name}</Chip>}
        </View>
        <Input value={search} onChangeText={setSearch} placeholder="Pesquisar nesta categoria..." />
      </View>

      <CompanyDirectoryList search={search} categoryId={categoryId} emptyMessage="Nenhuma empresa encontrada nesta categoria." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
