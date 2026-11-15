import { useMemo } from 'react';
import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Header comum a todos os `Stack` da app (o de `(app)` e um por tab).
 * Substitui o `TopBar`: no nativo, o ecrã raiz de cada tab mostra o título da
 * tab; no web, a navegação vive no `_layout.web.tsx` das tabs e o header só
 * aparece nos ecrãs empurrados (detalhe), para dar o "voltar".
 */
export function useStackScreenOptions(): NativeStackNavigationOptions {
  const { colors, textStyles } = useTheme();
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: colors.bg },
      headerShadowVisible: false,
      headerTintColor: colors.accentText,
      headerTitleStyle: {
        fontFamily: textStyles.name.fontFamily,
        fontSize: textStyles.name.fontSize,
        color: colors.text,
      },
      headerBackButtonDisplayMode: 'minimal',
      contentStyle: { backgroundColor: colors.bg },
    }),
    [colors, textStyles],
  );
}

/** O ecrã raiz de cada tab só tem header no nativo (ver acima). */
export const tabRootHeaderShown = Platform.OS !== 'web';
