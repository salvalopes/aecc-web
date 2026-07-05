// Color tokens — institutional blue (primary) + green (secondary), warm
// terracotta accent used sparingly for CTAs. Base blue (#0a7ea4) and semantic
// success/error/warning are the app's real, previously-hardcoded values.
// See the AECC design system's tokens/colors.css for the full ramp and the
// "Caveats" note on the marketing site's palette not being extractable.

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
  textLink: string;

  accentPrimary: string;
  accentPrimaryHover: string;
  accentPrimaryActive: string;
  accentSecondary: string;
  accentSecondaryHover: string;
  accentWarm: string;
  accentWarmHover: string;

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
}

export const lightColors: ThemeColors = {
  surfaceApp: '#f5f5f5',
  surfaceCard: '#ffffff',
  surfaceSunken: '#fafafa',
  surfaceOverlay: 'rgba(10, 15, 20, 0.92)',
  surfaceRaised: '#ffffff',

  borderSubtle: '#eeeeee',
  borderDefault: '#dddddd',
  borderStrong: '#999999',

  textPrimary: '#111111',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textOnAccent: '#ffffff',
  textLink: '#0b6e8f',

  accentPrimary: '#0b6e8f',
  accentPrimaryHover: '#0a5872',
  accentPrimaryActive: '#0d4457',
  accentSecondary: '#2e8158',
  accentSecondaryHover: '#256b48',
  accentWarm: '#c1622b',
  accentWarmHover: '#a04f22',

  focusRing: '#1387c9',

  success: '#2e7d32',
  successBg: '#e8f5e9',
  error: '#d32f2f',
  errorBg: '#fff5f5',
  warning: '#b26a00',
  warningBg: '#fff8e1',
  info: '#0b6e8f',
  infoBg: '#e3f4fb',
  featured: '#f5c518',
  featuredBg: '#fdf3d0',
};

export const darkColors: ThemeColors = {
  surfaceApp: '#10181d',
  surfaceCard: '#182229',
  surfaceSunken: '#0c1317',
  surfaceOverlay: 'rgba(0, 0, 0, 0.94)',
  surfaceRaised: '#1f2b33',

  borderSubtle: '#253039',
  borderDefault: '#34424c',
  borderStrong: '#4c5c66',

  textPrimary: '#f2f5f6',
  textSecondary: '#b6c2c9',
  textTertiary: '#7c8a92',
  textOnAccent: '#ffffff',
  textLink: '#6cc3e6',

  accentPrimary: '#2f9dc6',
  accentPrimaryHover: '#55b3d6',
  accentPrimaryActive: '#1b7fa4',
  accentSecondary: '#4aa877',
  accentSecondaryHover: '#63bd8d',
  accentWarm: '#e08a4d',
  accentWarmHover: '#eda06b',

  focusRing: '#6cc3e6',

  success: '#6cc27f',
  successBg: '#16261a',
  error: '#f08585',
  errorBg: '#2b1616',
  warning: '#e0ac47',
  warningBg: '#2b2210',
  info: '#6cc3e6',
  infoBg: '#142833',
  featured: '#f5c518',
  featuredBg: '#3a2f0a',
};
