import { Pressable, type PressableStateCallbackType } from 'react-native';
import { createStyles, useStyles } from '@/theme/createStyles';
import type { TextVariant } from '@/theme/typography';
import { Text } from './Text';

const factory = createStyles(({ size }) => ({
  hit: { minHeight: size.hitTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  label: { textDecorationLine: 'underline' },
}));

// O react-native-web acrescenta `hovered` ao estado do Pressable; no nativo nunca existe.
type LinkState = PressableStateCallbackType & { hovered?: boolean };

export interface TextLinkProps {
  label: string;
  onPress: () => void;
  variant?: Extract<TextVariant, 'body' | 'meta'>;
  testID?: string;
}

/**
 * Link de texto. Acento único: o link é `text` sublinhado e só passa a `accentText`
 * no hover (web) ou no press. Alvo tátil de 44px.
 */
export function TextLink({ label, onPress, variant = 'body', testID }: TextLinkProps) {
  const s = useStyles(factory);
  return (
    <Pressable testID={testID} accessibilityRole="link" onPress={onPress} style={s.hit}>
      {(state: LinkState) => (
        <Text
          variant={variant}
          color={state.pressed || state.hovered ? 'accentText' : 'text'}
          style={s.label}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
