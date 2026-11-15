// Color tokens — direção B · Maré (docs/redesign/fase2-direcoes.md §4 B).
// Os valores vivem em palette.ts; aqui ficam só papéis.
//
// Fase 3 / B6: as chaves antigas (@deprecated, apagadas na B14) passam a ser
// aliases dos papéis da Maré, por isso a app inteira muda de paleta sem tocar
// nos ecrãs. Mapeamento: surfaceApp→bg, surfaceCard→surface,
// surfaceSunken/surfaceRaised→raised, border*→border (strong→text3),
// textPrimary/Secondary/Tertiary→text/text2/text3, accentPrimary e
// accentGold→accent (dourado único), textOn*→onAccent, textLink→accentText,
// featured→accent/accentSoft, heroScrim→bg translúcido.

import { mareDark, mareLight } from './palette';

type MarePalette = typeof mareLight | typeof mareDark;

function roles(p: MarePalette, scrimRgb: string) {
  return {
    bg: p.bg,
    horizon: p.horizon,
    surface: p.surface,
    raised: p.raised,
    border: p.border,
    text: p.text,
    text2: p.text2,
    text3: p.text3,
    accent: p.accent,
    accentPressed: p.accentPressed,
    accentText: p.accentText,
    onAccent: p.onAccent,
    accentSoft: p.accentSoft,
    accentSoftText: p.accentSoftText,
    logoPlate: p.logoPlate,
    scrim: p.scrim,

    // ── Aliases antigos → Maré ──
    surfaceApp: p.bg,
    surfaceCard: p.surface,
    surfaceSunken: p.raised,
    surfaceOverlay: p.scrim,
    surfaceRaised: p.raised,

    borderSubtle: p.border,
    borderDefault: p.border,
    borderStrong: p.text3,

    textPrimary: p.text,
    textSecondary: p.text2,
    textTertiary: p.text3,
    textOnAccent: p.onAccent,
    textOnGold: p.onAccent,
    textOnPrimary: p.onAccent,
    textLink: p.accentText,

    accentPrimary: p.accent,
    accentPrimaryHover: p.accentPressed,
    accentPrimaryActive: p.accentPressed,
    accentGold: p.accent,
    accentGoldHover: p.accentPressed,
    accentGoldText: p.accentText,

    focusRing: p.focusRing,

    success: p.success,
    successBg: p.successBg,
    error: p.error,
    errorBg: p.errorBg,
    warning: p.warning,
    warningBg: p.warningBg,
    info: p.info,
    infoBg: p.infoBg,
    featured: p.accent,
    featuredBg: p.accentSoft,

    heroScrimFrom: `rgba(${scrimRgb}, 0.74)`,
    heroScrimMid: `rgba(${scrimRgb}, 0.88)`,
    heroScrimTo: p.bg,
  };
}

export interface ThemeColors {
  // ── Papéis novos (Maré). Fonte de verdade desde a B6. ──
  bg: string;
  horizon: string;
  surface: string;
  raised: string;
  border: string;
  text: string;
  text2: string;
  text3: string;
  accent: string;
  accentPressed: string;
  accentText: string;
  onAccent: string;
  accentSoft: string;
  accentSoftText: string;
  logoPlate: string;
  scrim: string;

  // ── Aliases antigos: @deprecated, removidos na B14. ──
  surfaceApp: string;
  surfaceCard: string;
  surfaceSunken: string;
  surfaceOverlay: string;
  surfaceRaised: string;

  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnAccent: string;
  textOnGold: string;
  /** Text/icon color for anything painted over glass.primary or accentPrimary — resolves to textOnAccent in light (navy primary) and textOnGold in dark (gold primary). */
  textOnPrimary: string;
  textLink: string;

  accentPrimary: string;
  accentPrimaryHover: string;
  accentPrimaryActive: string;
  accentGold: string;
  accentGoldHover: string;
  accentGoldText: string;

  focusRing: string;

  success: string;
  successBg: string;
  error: string;
  errorBg: string;
  warning: string;
  warningBg: string;
  info: string;
  infoBg: string;
  featured: string;
  featuredBg: string;

  // Hero scrim stops (Yellow Pages hero panel) — cream in light, navy-black in dark.
  heroScrimFrom: string;
  heroScrimMid: string;
  heroScrimTo: string;
}

export const lightColors: ThemeColors = roles(mareLight, '238, 242, 245');

export const darkColors: ThemeColors = roles(mareDark, '8, 22, 31');
