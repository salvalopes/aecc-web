// Spacing, radius, typography scale & shadow shapes — theme-independent.
// Values copied verbatim from the AECC design system (tokens/spacing.css,
// tokens/typography.css), which in turn lifted them from this app's own
// shipped StyleSheets. Never rounded to a generic 4/8 grid.

export const spacing = {
  1: 2,
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12,
  7: 14,
  8: 16,
  9: 20,
  10: 24,
  12: 28,
  14: 32,
  16: 40,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  pill: 20,
  round: 28,
  circle: 999,
} as const;

// Minimum interactive target (WCAG 2.5.5 / brief requirement)
export const hitTargetMin = 44;

// Radii used only by the "seamless glass" surfaces (buttons, bars, tiles) —
// see tokens/glass.css in the AECC design system. Every other radius lives
// in `radius` above.
export const glassRadius = {
  control: 14,
  panel: 20,
} as const;

export const fontFamily = {
  display: 'LibreFranklin',
  body: 'SourceSans3',
};

export const fontSize = {
  '2xs': 11,
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 32,
  '4xl': 40,
  '5xl': 52,
} as const;

export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.45,
  relaxed: 1.6,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '800',
} as const;

// Elevation — matches the shipped app's shadowOffset/Opacity/Radius + Android elevation.
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
