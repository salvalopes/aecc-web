import type { ReactNode } from 'react';
import { View } from 'react-native';
import { createStyles, useStyles } from '@/theme/createStyles';
import type { CompanyDirectoryEntry } from '@/types/api';
import { ListRow } from './ListGroup';
import { Plate } from './Plate';
import { Highlight } from './Highlight';

const factory = createStyles(() => ({ text: { flex: 1, gap: 2 } }));

export interface CompanyRowProps {
  company: Pick<
    CompanyDirectoryEntry,
    'name' | 'tradeName' | 'caeDescription' | 'locality' | 'logoUrl'
  >;
  /** Termo de pesquisa a realçar. */
  query?: string;
  onPress?: () => void;
  last?: boolean;
  /** Ações de contacto (`IconButton variant="contact"`). */
  actions?: ReactNode;
  testID?: string;
}

export function CompanyRow({
  company,
  query = '',
  onPress,
  last,
  actions,
  testID,
}: CompanyRowProps) {
  const s = useStyles(factory);
  const title = company.tradeName ?? company.name;
  const meta = [company.caeDescription, company.locality].filter(Boolean).join(' · ');
  return (
    <ListRow onPress={onPress} last={last} chevron={!actions && !!onPress} testID={testID}>
      <Plate company={company} />
      <View style={s.text}>
        <Highlight variant="name" text={title} query={query} numberOfLines={1} />
        {meta ? <Highlight variant="meta" text={meta} query={query} numberOfLines={1} /> : null}
      </View>
      {actions}
    </ListRow>
  );
}
