import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ListGroup, ListRow, Text } from '@/components/ui';

const factory = createStyles(({ spacing }) => ({
  text: { flex: 1, minWidth: spacing[0], gap: spacing['2xs'] },
}));

export interface InfoItem {
  key: string;
  label: string;
  value: string;
  icon?: IconName;
  /** Linha tocável (contacto, ligação interna). */
  onPress?: () => void;
  /** Navegação dentro da app (mostra o chevron). Os contactos externos não o mostram. */
  chevron?: boolean;
  accessibilityLabel?: string;
  tabular?: boolean;
  testID?: string;
}

/** Grupo de linhas rótulo/valor (T4): contactos, detalhes, configuração. */
export function InfoGroup({ items, testID }: { items: InfoItem[]; testID?: string }) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  const withIcons = items.some((i) => i.icon);
  return (
    <ListGroup testID={testID}>
      {items.map((item, index) => (
        <ListRow
          key={item.key}
          testID={item.testID}
          density="compact"
          inset={withIcons ? 'icon' : 'text'}
          last={index === items.length - 1}
          chevron={item.chevron}
          onPress={item.onPress}
          accessibilityLabel={item.accessibilityLabel ?? `${item.label}: ${item.value}`}
        >
          {item.icon ? <Icon name={item.icon} size={size.icon.md} color={colors.text3} /> : null}
          <View style={s.text}>
            <Text variant="meta">{item.label}</Text>
            <Text variant="body" tabular={item.tabular}>
              {item.value}
            </Text>
          </View>
        </ListRow>
      ))}
    </ListGroup>
  );
}
