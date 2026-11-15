import { Pressable, View, type PressableStateCallbackType } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const factory = createStyles(({ colors, radius, spacing, size, border, opacity }) => ({
  track: {
    flexDirection: 'row',
    padding: spacing['2xs'],
    borderRadius: radius.capsule,
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
    borderRadius: radius.capsule,
    borderCurve: 'continuous',
  },
  active: { backgroundColor: colors.accent },
  hover: { backgroundColor: colors.surface },
  disabled: { opacity: opacity.disabled },
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
  /** Mostra o valor sem deixar mudar (ex.: o próprio papel, T7). */
  disabled?: boolean;
}

const isHovered = (state: PressableStateCallbackType) =>
  !!(state as PressableStateCallbackType & { hovered?: boolean }).hovered;

/** Alternador (Lista | Tabela no web `lg`; tipo e papel nos formulários T7). O ativo é o acento sólido. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
}: SegmentedControlProps<T>) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  return (
    <View
      style={[s.track, disabled ? s.disabled : null]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={o.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: on, disabled }}
            disabled={disabled}
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
