import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme, type Theme } from './ThemeContext';

type Styles<T> = StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<unknown>;

/**
 * Declara uma factory de estilos, uma por ficheiro, no topo do módulo
 * (referência estável para a memoização do `useStyles`).
 */
export function createStyles<T extends Styles<T>>(factory: (theme: Theme) => T) {
  return factory;
}

export function useStyles<T extends Styles<T>>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  // O tema só muda com o esquema (as restantes partes são constantes).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(theme)), [factory, theme.scheme]);
}
