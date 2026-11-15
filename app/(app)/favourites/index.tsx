import { View } from 'react-native';
import { createStyles, useStyles } from '@/theme/createStyles';
import { EmptyState } from '@/components/ui';

const factory = createStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center' },
}));

// Placeholder — não existe ainda uma entidade "Favourite" na API. A rota está
// escondida nas tabs (B0), sem dados nem acções por trás.
export default function FavouritesScreen() {
  const s = useStyles(factory);

  return (
    <View style={s.screen}>
      <EmptyState icon="star" title="Em breve." />
    </View>
  );
}
