import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { EmptyState } from '@/components/ui';

// Placeholder — não existe ainda uma entidade "Favourite" na API. O separador
// fica visível (pedido do cliente), mas sem dados nem acções por trás.
export default function FavouritesScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceApp, justifyContent: 'center' }}>
      <EmptyState message="Em breve." />
    </View>
  );
}
