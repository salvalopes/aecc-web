// @deprecated (Fase 3 / B4): as 5 variantes abaixo já não têm consumidores — o vidro
// passa a ser o material único (`GlassMaterial`, `GlassSurface`). Apagado na B14.

import type { ViewStyle } from 'react-native';

export interface GlassVariant {
  tint: string;
  tintActive: string;
  border: string;
  /** Intensidade do blur antigo (0-100). */
  blurIntensity: number;
  /** Tint do blur antigo. */
  blurTint: 'light' | 'dark';
  shadow: Pick<
    ViewStyle,
    'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
  >;
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

// ── Fase 3 / B1: material único da Maré (§3.4), consumido pelo GlassSurface (B4). ──
export interface GlassMaterial {
  /** web: tint do vidro. */
  tint: string;
  /** web: +6% de opacidade no hover. */
  tintHover: string;
  border: string;
  /** cor do inset 0 1px 0. */
  highlight: string;
  /** fallback iOS < 26 / Reduce Transparency / Android (= raised). */
  solid: string;
  shadowTint: string;
  /** web: backdrop-filter. */
  webFilter: string;
}

const webFilter = 'blur(24px) saturate(170%)';

export const darkMaterial: GlassMaterial = {
  tint: 'rgba(15,36,51,0.55)',
  tintHover: 'rgba(15,36,51,0.61)',
  border: 'rgba(255,255,255,0.10)',
  highlight: 'rgba(255,255,255,0.08)',
  solid: '#15303F',
  shadowTint: 'rgba(2,10,16,0.45)',
  webFilter,
};

export const lightMaterial: GlassMaterial = {
  tint: 'rgba(255,255,255,0.62)',
  tintHover: 'rgba(255,255,255,0.68)',
  border: 'rgba(11,30,42,0.08)',
  highlight: 'rgba(255,255,255,0.8)',
  solid: '#F6F8FA',
  shadowTint: 'rgba(11,30,42,0.10)',
  webFilter,
};
