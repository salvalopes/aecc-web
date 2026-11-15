import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Altura do teclado no Android (0 nas outras plataformas e com o teclado fechado).
 *
 * Desde o SDK 54 o Android é edge-to-edge: a janela já não é redimensionada pelo
 * `windowSoftInputMode=adjustResize`, por isso os formulários têm de deixar eles próprios
 * espaço para o teclado (que chega até ao fundo do ecrã, barra de navegação incluída). No iOS
 * ficam o `KeyboardAvoidingView` e o `automaticallyAdjustKeyboardInsets`.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setInset(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return inset;
}
