import { Pressable, View, type PressableStateCallbackType } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from './Text';

const factory = createStyles(({ colors, radii, spacing, size, border }) => ({
  track: {
    flexDirection: 'row',
    padding: spacing['2xs'],
    borderRadius: radii.capsule,
    borderCurve: 'continuous',
    backgroundColor: colors.raised,
    borderWidth: border.hairline,
    borderColor: colors.border,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: size.hitTarget - spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.capsule,
    borderCurve: 'continuous',
  },
  active: { backgroundColor: colors.accent },
  hover: { backgroundColor: colors.surface },
}));

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  testID?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

const isHovered = (state: PressableStateCallbackType) =>
  !!(state as PressableStateCallbackType & { hovered?: boolean }).hovered;

/** Alternador de vista (Lista | Tabela, web `lg`). O ativo é o acento sólido. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  return (
    <View style={s.track} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={o.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={(state) => [
              s.segment,
              on ? s.active : state.pressed || isHovered(state) ? s.hover : null,
            ]}
          >
            {o.icon ? (
              <Icon name={o.icon} size={size.icon.sm} color={on ? colors.onAccent : colors.text2} />
            ) : null}
            <Text variant="meta" color={on ? 'onAccent' : 'text2'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
