// Color tokens — direção B · Maré (docs/redesign/fase2-direcoes.md §4 B).
// Os valores vivem em palette.ts; aqui ficam só papéis. Os aliases antigos
// (surfaceApp, textPrimary, accentPrimary…) saíram na B14.

import { mareDark, mareLight } from './palette';

type MarePalette = typeof mareLight | typeof mareDark;

export interface ThemeColors {
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
  focusRing: string;

  success: string;
  successBg: string;
  error: string;
  errorBg: string;
  warning: string;
  warningBg: string;
  info: string;
  infoBg: string;
}

function roles(p: MarePalette): ThemeColors {
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
    focusRing: p.focusRing,

    success: p.success,
    successBg: p.successBg,
    error: p.error,
    errorBg: p.errorBg,
    warning: p.warning,
    warningBg: p.warningBg,
    info: p.info,
    infoBg: p.infoBg,
  };
}

export const lightColors: ThemeColors = roles(mareLight);

export const darkColors: ThemeColors = roles(mareDark);
