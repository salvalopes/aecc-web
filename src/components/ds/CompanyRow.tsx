import type { ReactNode } from 'react';
import { View } from 'react-native';
import { createStyles, useStyles } from '@/theme/createStyles';
import type { CompanyDirectoryEntry } from '@/types/api';
import { ListRow } from './ListGroup';
import { Plate } from './Plate';
import { Highlight } from './Highlight';
import { Text } from './Text';

const factory = createStyles(({ spacing }) => ({
  text: { flex: 1, minWidth: 0, gap: spacing['2xs'] },
}));

export interface CompanyRowProps {
  company: Pick<
    CompanyDirectoryEntry,
    'name' | 'tradeName' | 'caeDescription' | 'locality' | 'logoUrl'
  >;
  /** Termo de pesquisa a realçar. */
  query?: string;
  onPress?: () => void;
  last?: boolean;
  /** Ações à direita (`IconButton variant="contact"`, `Button sm`). Tiram o chevron. */
  actions?: ReactNode;
  /** Coluna de texto à direita (web `md+`: localidade, telefone, domínio). Tira a localidade da coluna principal. */
  aside?: ReactNode;
  density?: 'regular' | 'compact';
  testID?: string;
}

/** Linha de empresa (D4): plate, `tradeName ?? name`, atividade (`meta`) e localidade (`text3`). */
export function CompanyRow({
  company,
  query = '',
  onPress,
  last,
  actions,
  aside,
  density,
  testID,
}: CompanyRowProps) {
  const s = useStyles(factory);
  const title = company.tradeName ?? company.name;
  return (
    <ListRow
      onPress={onPress}
      last={last}
      density={density}
      chevron={!actions && !!onPress}
      testID={testID}
      accessibilityLabel={title}
    >
      <Plate company={company} />
      <View style={s.text}>
        <Highlight variant="name" text={title} query={query} numberOfLines={2} />
        {company.caeDescription ? (
          <Highlight variant="meta" text={company.caeDescription} query={query} numberOfLines={1} />
        ) : null}
        {company.locality && !aside ? (
          <Highlight
            variant="meta"
            color="text3"
            text={company.locality}
            query={query}
            numberOfLines={1}
          />
        ) : null}
      </View>
      {aside}
      {actions}
    </ListRow>
  );
}

/** Coluna de contacto em texto para a `aside` (web `md+`). */
export function CompanyRowAside({
  lines,
}: {
  lines: { text: string; tone?: 'text2' | 'text3'; tabular?: boolean }[];
}) {
  const s = useStyles(asideFactory);
  return (
    <View style={s.aside}>
      {lines.map((l, i) => (
        <Text
          key={i}
          variant="meta"
          color={l.tone ?? 'text2'}
          tabular={l.tabular}
          numberOfLines={1}
          style={s.right}
        >
          {l.text}
        </Text>
      ))}
    </View>
  );
}

const asideFactory = createStyles(({ spacing, layout }) => ({
  aside: { width: layout.rowAside, alignItems: 'flex-end', gap: spacing['2xs'] },
  right: { textAlign: 'right' },
}));
