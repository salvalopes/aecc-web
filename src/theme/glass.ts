// "Seamless glass" surface tokens — Aug-2026 renovation. Buttons, the
// TopBar, the TabBar, category tiles and the hero panel are translucent:
// a tint (backgroundColor), a blur of what's behind (expo-blur's
// <BlurView intensity tint>), a 1px lit border, and a soft ambient shadow.
// Values are the RN-equivalent of the AECC design system's tokens/glass.css.
// See src/theme/glass.ts consumers for the BlurView usage pattern.

import type { ViewStyle } from 'react-native';

export interface GlassVariant {
  tint: string;
  tintActive: string;
  border: string;
  /** expo-blur <BlurView intensity> (0-100). */
  blurIntensity: number;
  /** expo-blur <BlurView tint> — matches the underlying theme, not the variant. */
  blurTint: 'light' | 'dark';
  shadow: Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;
}

export interface GlassTokens {
  /** Neutral glass — search fields, secondary buttons, value-prop wells. */
  neutral: GlassVariant;
  /** Primary action glass — navy in light mode, gold in dark mode (gold leads dark). */
  primary: GlassVariant;
  /** Yellow Pages highlight action — always gold. */
  gold: GlassVariant;
  /** TopBar / TabBar / floating panels. */
  panel: GlassVariant;
  /** Hero copy panel — more opaque, guarantees AA over any background. */
  heroPanel: GlassVariant;
}

const ambientLight = {
  shadowColor: '#0a2637',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.16,
  shadowRadius: 14,
  elevation: 4,
};

const ambientDark = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.45,
  shadowRadius: 16,
  elevation: 4,
};

export const lightGlass: GlassTokens = {
  neutral: {
    tint: 'rgba(255, 253, 248, 0.62)',
    tintActive: 'rgba(245, 235, 214, 0.88)',
    border: 'rgba(255, 255, 255, 0.75)',
    blurIntensity: 40,
    blurTint: 'light',
    shadow: ambientLight,
  },
  primary: {
    tint: 'rgba(19, 77, 111, 0.86)',
    tintActive: 'rgba(12, 50, 71, 0.96)',
    border: 'rgba(255, 255, 255, 0.28)',
    blurIntensity: 40,
    blurTint: 'light',
    shadow: { ...ambientLight, shadowColor: '#134d6f', shadowOpacity: 0.35 },
  },
  gold: {
    tint: 'rgba(237, 177, 45, 0.88)',
    tintActive: 'rgba(210, 154, 26, 0.96)',
    border: 'rgba(255, 255, 255, 0.45)',
    blurIntensity: 40,
    blurTint: 'light',
    shadow: { ...ambientLight, shadowColor: '#edb12d', shadowOpacity: 0.4 },
  },
  panel: {
    tint: 'rgba(255, 253, 248, 0.55)',
    tintActive: 'rgba(255, 253, 248, 0.55)',
    border: 'rgba(255, 255, 255, 0.65)',
    blurIntensity: 30,
    blurTint: 'light',
    shadow: ambientLight,
  },
  heroPanel: {
    tint: 'rgba(255, 253, 248, 0.88)',
    tintActive: 'rgba(255, 253, 248, 0.88)',
    border: 'rgba(255, 255, 255, 0.72)',
    blurIntensity: 50,
    blurTint: 'light',
    shadow: ambientLight,
  },
};

export const darkGlass: GlassTokens = {
  neutral: {
    tint: 'rgba(26, 55, 75, 0.58)',
    tintActive: 'rgba(18, 41, 58, 0.86)',
    border: 'rgba(237, 177, 45, 0.22)',
    blurIntensity: 40,
    blurTint: 'dark',
    shadow: ambientDark,
  },
  // Dark mode leads with gold: the "primary" glass becomes gold glass.
  primary: {
    tint: 'rgba(237, 177, 45, 0.90)',
    tintActive: 'rgba(210, 154, 26, 1)',
    border: 'rgba(255, 255, 255, 0.35)',
    blurIntensity: 40,
    blurTint: 'dark',
    shadow: { ...ambientDark, shadowColor: '#edb12d', shadowOpacity: 0.35 },
  },
  gold: {
    tint: 'rgba(237, 177, 45, 0.90)',
    tintActive: 'rgba(210, 154, 26, 1)',
    border: 'rgba(255, 255, 255, 0.35)',
    blurIntensity: 40,
    blurTint: 'dark',
    shadow: { ...ambientDark, shadowColor: '#edb12d', shadowOpacity: 0.35 },
  },
  panel: {
    tint: 'rgba(18, 41, 58, 0.62)',
    tintActive: 'rgba(18, 41, 58, 0.62)',
    border: 'rgba(237, 177, 45, 0.20)',
    blurIntensity: 30,
    blurTint: 'dark',
    shadow: ambientDark,
  },
  heroPanel: {
    tint: 'rgba(14, 32, 45, 0.90)',
    tintActive: 'rgba(14, 32, 45, 0.90)',
    border: 'rgba(237, 177, 45, 0.26)',
    blurIntensity: 50,
    blurTint: 'dark',
    shadow: ambientDark,
  },
};
