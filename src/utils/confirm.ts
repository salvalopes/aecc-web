import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Rótulo da ação destrutiva (ex.: "Apagar"). */
  confirmLabel: string;
}

/**
 * Confirmação de uma ação irreversível (DESIGN.md §5: `Alert.alert` no nativo, `window.confirm`
 * no web). No react-native-web o `Alert.alert` não faz nada, por isso o web precisa do seu caminho.
 */
export function confirmDestructive({ title, message, confirmLabel }: ConfirmOptions) {
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`),
    );
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
