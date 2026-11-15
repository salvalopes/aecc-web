import { Linking, View } from 'react-native';
import { router } from 'expo-router';
import { createStyles, useStyles } from '@/theme/createStyles';
import {
  CompanyRow,
  CompanyRowAside,
  DataTable,
  EmptyState,
  ErrorState,
  Highlight,
  IconButton,
  ListGroup,
  Plate,
  SkeletonRow,
  Text,
  type DataTableColumn,
} from '@/components/ds';
import type { CompanyDirectoryEntry } from '@/types/api';
import { absoluteUrl, displayDomain, telUrl } from '@/utils/text';

export type DirectoryView = 'list' | 'table';

const INITIAL_SKELETONS = 6;
const MORE_SKELETONS = 3;

const factory = createStyles(({ spacing }) => ({
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  company: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  companyName: { flex: 1, minWidth: 0 },
}));

const open = (url: string) => {
  Linking.openURL(url).catch(() => {
    // Sem app para o esquema (ex.: `tel:` no simulador): não há nada a fazer aqui.
  });
};

const goTo = (c: CompanyDirectoryEntry) => router.push(`/companies/${c.id}`);
const title = (c: CompanyDirectoryEntry) => c.tradeName ?? c.name;

function ContactActions({ company }: { company: CompanyDirectoryEntry }) {
  const s = useStyles(factory);
  return (
    <View style={s.actions}>
      {company.phone ? (
        <IconButton
          variant="contact"
          icon="phone"
          label={`Ligar para ${title(company)}`}
          onPress={() => open(telUrl(company.phone!))}
        />
      ) : null}
      {company.website ? (
        <IconButton
          variant="contact"
          icon="globe"
          label={`Abrir o site de ${title(company)}`}
          onPress={() => open(absoluteUrl(company.website!))}
        />
      ) : null}
    </View>
  );
}

const dash = (
  <Text variant="meta" color="text3">
    —
  </Text>
);

function columns(query: string): DataTableColumn<CompanyDirectoryEntry>[] {
  return [
    {
      key: 'empresa',
      label: 'Empresa',
      flex: 3.2,
      skeletonWidth: '72%',
      render: (c) => <CompanyCell company={c} query={query} />,
    },
    {
      key: 'atividade',
      label: 'Atividade',
      flex: 3,
      render: (c) =>
        c.caeDescription ? (
          <Text variant="meta" numberOfLines={1}>
            {c.caeDescription}
          </Text>
        ) : (
          dash
        ),
    },
    {
      key: 'localidade',
      label: 'Localidade',
      flex: 1.6,
      skeletonWidth: '50%',
      render: (c) =>
        c.locality ? (
          <Text variant="meta" numberOfLines={1}>
            {c.locality}
          </Text>
        ) : (
          dash
        ),
    },
    {
      key: 'telefone',
      label: 'Telefone',
      flex: 1.9,
      render: (c) =>
        c.phone ? (
          <Text variant="meta" tabular numberOfLines={1}>
            {c.phone}
          </Text>
        ) : (
          dash
        ),
    },
    {
      key: 'site',
      label: 'Site',
      flex: 2,
      render: (c) =>
        c.website ? (
          <Text variant="meta" numberOfLines={1}>
            {displayDomain(c.website)}
          </Text>
        ) : (
          dash
        ),
    },
  ];
}

function CompanyCell({ company, query }: { company: CompanyDirectoryEntry; query: string }) {
  const s = useStyles(factory);
  return (
    <View style={s.company}>
      <Plate company={company} size="sm" />
      <Highlight
        variant="name"
        text={title(company)}
        query={query}
        numberOfLines={1}
        style={s.companyName}
      />
    </View>
  );
}

export interface DirectoryResultsProps {
  entries: CompanyDirectoryEntry[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  query: string;
  category: string | null;
  onClearFilters: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  view: DirectoryView;
  /** md+: linhas de 64 com o contacto em texto, em vez dos botões. */
  wide: boolean;
}

export function DirectoryResults({
  entries,
  loading,
  loadingMore,
  error,
  query,
  category,
  onClearFilters,
  onRetry,
  onLoadMore,
  view,
  wide,
}: DirectoryResultsProps) {
  const initial = loading && entries.length === 0;

  // Erro sem nada para mostrar: o painel inline substitui a lista.
  if (error && entries.length === 0 && !loading) {
    return <ErrorState testID="directory.error" message={error} onRetry={onRetry} />;
  }

  const filtered = !!query.trim() || !!category;
  const empty = (
    <EmptyState
      testID="directory.empty"
      align="start"
      title={
        query.trim()
          ? `Nenhuma empresa para «${query.trim()}»`
          : category
            ? `Ainda não há empresas em ${category}`
            : 'Ainda não há empresas no diretório'
      }
      description={
        query.trim()
          ? `A pesquisa procura no nome e na marca. Confirme a grafia ou escreva só uma parte do nome${category ? `, ou retire o filtro ${category}` : ''}.`
          : category
            ? 'Escolha outra categoria ou veja todas as empresas associadas.'
            : 'As empresas aparecem aqui assim que forem aprovadas pela AECC.'
      }
      actionLabel={filtered ? 'Limpar filtros' : undefined}
      actionVariant="glass"
      onAction={onClearFilters}
    />
  );

  const loadMoreError =
    error && entries.length > 0 ? <ErrorState message={error} onRetry={onLoadMore} /> : null;

  if (view === 'table') {
    return (
      <>
        <DataTable
          testID="directory.table"
          columns={columns(query)}
          rows={initial ? [] : entries}
          keyExtractor={(c) => c.id}
          onRowPress={goTo}
          rowTestID="directory.row"
          rowLabel={title}
          loadingRows={initial ? INITIAL_SKELETONS : loadingMore ? MORE_SKELETONS : 0}
          empty={empty}
        />
        {loadMoreError}
      </>
    );
  }

  const density = wide ? 'compact' : 'regular';
  const skeletons = initial ? INITIAL_SKELETONS : loadingMore ? MORE_SKELETONS : 0;

  return (
    <>
      <ListGroup testID="directory.list">
        {!initial && entries.length === 0 ? empty : null}
        {!initial
          ? entries.map((c, i) => (
              <CompanyRow
                key={c.id}
                testID="directory.row"
                company={c}
                query={query}
                density={density}
                onPress={() => goTo(c)}
                last={i === entries.length - 1 && skeletons === 0}
                aside={
                  wide ? (
                    <CompanyRowAside
                      lines={[
                        ...(c.locality ? [{ text: c.locality, tone: 'text3' as const }] : []),
                        ...(c.phone ? [{ text: c.phone, tabular: true }] : []),
                        ...(c.website ? [{ text: displayDomain(c.website) }] : []),
                      ]}
                    />
                  ) : undefined
                }
                actions={
                  !wide && (c.phone || c.website) ? <ContactActions company={c} /> : undefined
                }
              />
            ))
          : null}
        {Array.from({ length: skeletons }, (_, i) => (
          <SkeletonRow key={`sk-${i}`} index={i} density={density} last={i === skeletons - 1} />
        ))}
      </ListGroup>
      {loadMoreError}
    </>
  );
}
