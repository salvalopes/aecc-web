import type { ReactNode } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import type { Category, CompanyDirectoryEntry } from '@/types/api';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from '@/components/ui/Icon';
import { categoryIcon } from '@/utils/categoryIcons';
import {
  CompanyRow,
  EmptyState,
  ListGroup,
  ListRow,
  Skeleton,
  SkeletonRow,
  Text,
} from '@/components/ui';

// T5 Início (B13), direção Maré: as secções do Início são grupos sólidos com o rótulo por
// cima, como no resto da app. Sem tiles nem cartões iguais em grelha (skill: AI tells).
const factory = createStyles(({ spacing }) => ({
  section: { gap: spacing.sm },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  text: { flex: 1, minWidth: spacing[0], gap: spacing['2xs'] },
  grow: { flex: 1 },
}));

export function HomeSection({
  label,
  meta,
  children,
  testID,
}: {
  label: string;
  /** À direita do rótulo (contagem). */
  meta?: string;
  children: ReactNode;
  testID?: string;
}) {
  const s = useStyles(factory);
  return (
    <View testID={testID} style={s.section}>
      <View style={s.head}>
        <Text variant="label" accessibilityRole="header">
          {label}
        </Text>
        {meta ? (
          <Text variant="meta" color="text3" tabular>
            {meta}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const toCategory = (c: Category) =>
  router.push({ pathname: '/companies', params: { categoryId: c.id } });

/** Categorias de topo: ícone, nome e as subcategorias como `meta` (o que lá se encontra). */
export function CategoryList({
  categories,
  density,
}: {
  categories: readonly Category[];
  density: 'regular' | 'compact';
}) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  return (
    <ListGroup testID="home.categories">
      {categories.map((c, index) => (
        <ListRow
          key={c.id}
          testID={`home.category-${c.slug}`}
          inset="icon"
          density={density}
          chevron
          last={index === categories.length - 1}
          onPress={() => toCategory(c)}
          accessibilityLabel={`Ver empresas de ${c.name}`}
        >
          <Icon name={categoryIcon(c.slug)} size={size.icon.md} color={colors.text2} />
          <View style={s.text}>
            <Text variant="name" numberOfLines={1}>
              {c.name}
            </Text>
            {c.children.length > 0 ? (
              <Text variant="meta" numberOfLines={1}>
                {c.children.map((ch) => ch.name).join(', ')}
              </Text>
            ) : null}
          </View>
        </ListRow>
      ))}
    </ListGroup>
  );
}

// Larguras variadas: o esqueleto não deve parecer uma tabela de barras iguais.
const BAR = ['46%', '62%', '38%', '55%', '42%'] as const;

export function CategoryListSkeleton({ rows = 5 }: { rows?: number }) {
  const s = useStyles(factory);
  const { size } = useTheme();
  return (
    <ListGroup testID="home.loading" accessibilityLabel="A carregar categorias">
      {Array.from({ length: rows }, (_, i) => (
        <ListRow key={i} inset="icon" last={i === rows - 1}>
          <Skeleton width={size.icon.md} height={size.icon.md} />
          <View style={s.text}>
            <Skeleton width={BAR[i % BAR.length]} height={14} />
            <Skeleton width={BAR[(i + 2) % BAR.length]} height={10} />
          </View>
        </ListRow>
      ))}
    </ListGroup>
  );
}

/** Uma amostra do diretório e a entrada para a lista completa (última linha). */
export function CompanyPreview({
  companies,
  totalCount,
  density,
}: {
  companies: readonly CompanyDirectoryEntry[];
  totalCount: number;
  density: 'regular' | 'compact';
}) {
  const s = useStyles(factory);
  if (companies.length === 0) {
    return (
      <ListGroup testID="home.companies">
        <EmptyState
          icon="storefront"
          align="start"
          title="Ainda não há empresas no diretório"
          description="As empresas aparecem aqui quando um associado as publica."
        />
      </ListGroup>
    );
  }
  return (
    <ListGroup testID="home.companies">
      {companies.map((c) => (
        <CompanyRow
          key={c.id}
          testID="home.company"
          company={c}
          density={density}
          onPress={() => router.push(`/companies/${c.id}`)}
        />
      ))}
      <ListRow
        testID="home.all-companies"
        inset="text"
        density="compact"
        last
        chevron
        onPress={() => router.push('/companies')}
      >
        <Text variant="name" color="accentText" style={s.grow}>
          {totalCount === 1 ? 'Ver a empresa' : `Ver as ${totalCount} empresas`}
        </Text>
      </ListRow>
    </ListGroup>
  );
}

export function CompanyPreviewSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ListGroup accessibilityLabel="A carregar empresas">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} index={i} last={i === rows - 1} />
      ))}
    </ListGroup>
  );
}
