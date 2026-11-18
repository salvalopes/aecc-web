import { ScrollView, View } from 'react-native';
import { Button, Icon, IconButton, ListGroup, ListRow, Surface, Text } from '@/components/ui';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import type { MapCompany } from '@/types/api';

export const AREA_NOTE = 'Localização aproximada (zona do código postal)';

const factory = createStyles(({ layout, size, spacing }) => ({
  card: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { flex: 1, gap: spacing['2xs'] },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowText: { flex: 1, gap: spacing['2xs'] },
  // A lista de um grupo grande faz scroll em vez de empurrar o mapa (≈ 3,5 linhas visíveis).
  groupList: { maxHeight: size.row.web * 3.5 },
}));

interface CardProps {
  categoryOf: (company: MapCompany) => string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
}

/** Ficha de um pino (`map.card`): nome, categoria, nota de zona aproximada e "Ver empresa". */
export function CompanyCard({
  company,
  categoryOf,
  onOpen,
  onClose,
}: CardProps & { company: MapCompany }) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  const category = categoryOf(company);
  return (
    <Surface testID="map.card" style={s.card}>
      <View style={s.head}>
        <View style={s.title}>
          <Text variant="heading" accessibilityRole="header">
            {company.name}
          </Text>
          {category ? <Text variant="meta">{category}</Text> : null}
        </View>
        <IconButton testID="map.card.close" icon="x" label="Fechar" onPress={onClose} />
      </View>
      {company.precision === 'area' ? (
        <View style={s.note} testID="map.card.area">
          <Icon name="map-pin" size={size.icon.sm} color={colors.text3} />
          <Text variant="meta">{AREA_NOTE}</Text>
        </View>
      ) : null}
      <Button testID="map.card.open" label="Ver empresa" onPress={() => onOpen(company.id)} />
    </Surface>
  );
}

/** Lista das empresas de um cluster que não se desfaz (`map.group`), ex.: vários ENI no mesmo CP4. */
export function CompanyGroup({
  companies,
  categoryOf,
  onOpen,
  onClose,
}: CardProps & { companies: readonly MapCompany[] }) {
  const s = useStyles(factory);
  return (
    <Surface testID="map.group" style={s.card}>
      <View style={s.head}>
        <View style={s.title}>
          <Text variant="heading" accessibilityRole="header">
            {companies.length} empresas neste local
          </Text>
          {companies.some((c) => c.precision === 'area') ? (
            <Text variant="meta">{AREA_NOTE}</Text>
          ) : null}
        </View>
        <IconButton testID="map.group.close" icon="x" label="Fechar" onPress={onClose} />
      </View>
      <ScrollView style={s.groupList}>
        <ListGroup>
          {companies.map((company, index) => {
            const category = categoryOf(company);
            return (
              <ListRow
                key={company.id}
                testID={`map.group.item.${company.id}`}
                accessibilityLabel={`Ver empresa ${company.name}`}
                onPress={() => onOpen(company.id)}
                chevron
                inset="text"
                density="compact"
                last={index === companies.length - 1}
              >
                <View style={s.rowText}>
                  <Text variant="name">{company.name}</Text>
                  {category ? <Text variant="meta">{category}</Text> : null}
                </View>
              </ListRow>
            );
          })}
        </ListGroup>
      </ScrollView>
    </Surface>
  );
}
