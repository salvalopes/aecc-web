import { useWindowDimensions } from 'react-native';
import { breakpoints } from './tokens';

export type Breakpoint = 'sm' | 'md' | 'lg';

/** `sm` < 768 (coluna única) · `md` ≥ 768 · `lg` ≥ 1280. */
export function useBreakpoint(): { breakpoint: Breakpoint; isWide: boolean; width: number } {
  const { width } = useWindowDimensions();
  const breakpoint: Breakpoint =
    width >= breakpoints.lg ? 'lg' : width >= breakpoints.md ? 'md' : 'sm';
  return { breakpoint, isWide: breakpoint !== 'sm', width };
}
