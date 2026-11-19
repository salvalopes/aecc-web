import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Button,
  Icon,
  IconButton,
  ListGroup,
  ListRow,
  Skeleton,
  Surface,
  Text,
} from '@/components/ui';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import type { MapCompany } from '@/types/api';

export const AREA_NOTE = 'Zona aproximada: localização pela zona do código postal, não pela morada';

const factory = createStyles(({ layout, size, spacing }) => ({
  card: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  // Sem superfície: a ficha vive dentro de outra (o painel do mapa no desktop, a folha flutuante no
  // telemóvel), que já dá o fundo e o padding. Evita o cartão dentro de cartão (A1 #12).
  bare: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { flex: 1, gap: spacing['2xs'] },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.xs },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowText: { flex: 1, gap: spacing['2xs'] },
  // A lista de um grupo grande faz scroll em vez de empurrar o mapa (≈ 3,5 linhas visíveis).
  groupList: { maxHeight: size.row.web * 3.5 },
}));

export type CompanyCardVariant = 'surface' | 'bare';

interface CardProps {
  categoryOf: (company: MapCompany) => string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
  /** `surface` (omissão): com a própria `Surface`. `bare`: sem fundo nem padding. */
  variant?: CompanyCardVariant;
}

function Shell({
  variant,
  testID,
  children,
}: {
  variant: CompanyCardVariant;
  testID: string;
  children: ReactNode;
}) {
  const s = useStyles(factory);
  return variant === 'bare' ? (
    <View testID={testID} style={s.bare}>
      {children}
    </View>
  ) : (
    <Surface testID={testID} style={s.card}>
      {children}
    </Surface>
  );
}

/**
 * Ficha de um pino (`map.card`): nome, categoria, localidade, nota de zona aproximada e "Ver
 * empresa". A localidade vem do detalhe (`GET /companies/{id}`), pedido pelo ecrã ao abrir a ficha:
 * `undefined` = a carregar, `null` = sem localidade. Nunca morada nem coordenadas.
 */
export function CompanyCard({
  company,
  locality,
  categoryOf,
  onOpen,
  onClose,
  variant = 'surface',
}: CardProps & { company: MapCompany; locality: string | null | undefined }) {
  const s = useStyles(factory);
  const { colors, size, spacing } = useTheme();
  const category = categoryOf(company);
  return (
    <Shell variant={variant} testID="map.card">
      <View style={s.head}>
        <View style={s.title}>
          <Text variant="heading" accessibilityRole="header">
            {company.name}
          </Text>
          <View style={s.meta}>
            {category ? <Text variant="meta">{category}</Text> : null}
            {category && locality !== null ? <Text variant="meta">·</Text> : null}
            {locality === undefined ? (
              <Skeleton width={spacing['6xl'] * 2} />
            ) : locality ? (
              <Text testID="map.card.locality" variant="meta">
                {locality}
              </Text>
            ) : null}
          </View>
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
    </Shell>
  );
}

/** Lista das empresas de um cluster que não se desfaz (`map.group`), ex.: vários ENI no mesmo CP4. */
export function CompanyGroup({
  companies,
  categoryOf,
  onOpen,
  onClose,
  variant = 'surface',
}: CardProps & { companies: readonly MapCompany[] }) {
  const s = useStyles(factory);
  return (
    <Shell variant={variant} testID="map.group">
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
    </Shell>
  );
}
