// Color tokens — Aug-2026 "Yellow Pages" renovation. Every hue is sampled
// directly from the real brand mark (assets/brand/aecc-logo.webp): navy
// wordmark #134d6f, gold ribbon #edb12d, red #d22f2d, green #0e904f, blue
// #2e8fc2. Light mode is a warm cream ladder tinted toward the gold; dark
// mode is navy-black with gold as the lead accent ("detalhes amarelos").
// See the AECC design system's tokens/colors.css for the full ramp.

export interface ThemeColors {
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

export const lightColors: ThemeColors = {
  surfaceApp: '#fdf9f0',
  surfaceCard: '#fffdf8',
  surfaceSunken: '#faf3e4',
  surfaceOverlay: 'rgba(7, 28, 40, 0.90)',
  surfaceRaised: '#fffdf8',

  borderSubtle: '#f5ebd6',
  borderDefault: '#ecdfc4',
  borderStrong: '#b3a488',

  textPrimary: '#0a2637',
  textSecondary: '#6b6153',
  textTertiary: '#8a7d66',
  textOnAccent: '#ffffff',
  textOnGold: '#0a2637',
  textLink: '#134d6f',

  accentPrimary: '#134d6f',
  accentPrimaryHover: '#0f3f5b',
  accentPrimaryActive: '#0c3247',
  accentGold: '#edb12d',
  accentGoldHover: '#d29a1a',
  accentGoldText: '#7f580c',

  focusRing: 'rgba(19, 77, 111, 0.45)',

  success: '#0b743f',
  successBg: '#e6f5ec',
  error: '#b02220',
  errorBg: '#fdeceb',
  warning: '#7f580c',
  warningBg: '#fbefcb',
  info: '#21739f',
  infoBg: '#e6f2f9',
  featured: '#edb12d',
  featuredBg: '#fbefcb',

  heroScrimFrom: 'rgba(253, 249, 240, 0.80)',
  heroScrimMid: 'rgba(253, 249, 240, 0.90)',
  heroScrimTo: '#fdf9f0',
};

export const darkColors: ThemeColors = {
  surfaceApp: '#0b1a24',
  surfaceCard: '#12293a',
  surfaceSunken: '#081420',
  surfaceOverlay: 'rgba(3, 12, 18, 0.94)',
  surfaceRaised: '#1a374b',

  borderSubtle: '#1d3a4e',
  borderDefault: '#2b4d64',
  borderStrong: '#436b85',

  textPrimary: '#f2f6f8',
  textSecondary: '#a9c0cf',
  textTertiary: '#7793a5',
  textOnAccent: '#ffffff',
  textOnGold: '#1f1600',
  textLink: '#f2c85a',

  // Dark mode leads with gold: the primary accent becomes gold rather than a
  // lightened navy, so every primary action/active tab/link turns gold.
  accentPrimary: '#edb12d',
  accentPrimaryHover: '#f2c85a',
  accentPrimaryActive: '#d29a1a',
  accentGold: '#edb12d',
  accentGoldHover: '#f2c85a',
  accentGoldText: '#f2c85a',

  focusRing: 'rgba(237, 177, 45, 0.55)',

  success: '#2fb371',
  successBg: '#0b2a1b',
  error: '#f08483',
  errorBg: '#2e1413',
  warning: '#f2c85a',
  warningBg: '#2e2205',
  info: '#5aacd6',
  infoBg: '#0e2a3a',
  featured: '#edb12d',
  featuredBg: '#33260a',

  heroScrimFrom: 'rgba(11, 26, 36, 0.74)',
  heroScrimMid: 'rgba(11, 26, 36, 0.88)',
  heroScrimTo: '#0b1a24',
};
