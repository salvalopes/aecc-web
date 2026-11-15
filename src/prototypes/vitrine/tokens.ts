// A · Vitrine — montra luminosa em pedra quente. Acento único: navy. Neutros: escada quente.
import type { ProtoColors, ProtoFonts, ProtoTokens, ProtoType, Scheme } from '../types';

export const vitrineFonts: ProtoFonts = {
  display: 'Outfit_600SemiBold',
  displayMedium: 'Outfit_500Medium',
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_600SemiBold',
};

export const vitrineFontFiles = {
  Outfit_500Medium: require('../../../assets/fonts/prototypes/outfit/Outfit_500Medium.ttf'),
  Outfit_600SemiBold: require('../../../assets/fonts/prototypes/outfit/Outfit_600SemiBold.ttf'),
  Figtree_400Regular: require('../../../assets/fonts/prototypes/figtree/Figtree_400Regular.ttf'),
  Figtree_500Medium: require('../../../assets/fonts/prototypes/figtree/Figtree_500Medium.ttf'),
  Figtree_600SemiBold: require('../../../assets/fonts/prototypes/figtree/Figtree_600SemiBold.ttf'),
};

const light: ProtoColors = {
  bg: '#FAF8F4',
  horizon: '#FAF8F4',
  surface: '#FFFFFF',
  sunken: '#F1EEE8',
  border: '#E4DFD6',
  text: '#1C1A17',
  text2: '#5E5850',
  text3: '#6E685F',
  accent: '#134D6F',
  accentPressed: '#0E3B56',
  accentText: '#134D6F',
  onAccent: '#FFFFFF',
  accentSoft: '#E3EDF3',
  accentSoftText: '#134D6F',
  logoPlate: '#FFFFFF',
  shadowTint: 'rgba(60,48,32,0.08)',
  error: '#C4302E',
  errorBg: '#FBEAE8',
  success: '#1D7A4C',
  successBg: '#E7F3EC',
  info: '#2479A8',
  infoBg: '#E6F1F8',
  glassTint: 'rgba(250,248,244,0.78)',
  glassTintHover: 'rgba(250,248,244,0.88)',
  glassBorder: '#E4DFD6',
  glassHighlight: 'rgba(255,255,255,0.7)',
  glassSolid: '#FFFFFF',
};

const dark: ProtoColors = {
  bg: '#161412',
  horizon: '#161412',
  surface: '#201D1A',
  sunken: '#110F0D',
  border: '#312D29',
  text: '#F2EEE8',
  text2: '#B3ACA2',
  text3: '#8F887E',
  accent: '#8FC0DD',
  accentPressed: '#B0D3E7',
  accentText: '#8FC0DD',
  onAccent: '#10222E',
  accentSoft: '#1B2A33',
  accentSoftText: '#8FC0DD',
  logoPlate: '#F2EEE8',
  shadowTint: 'rgba(0,0,0,0)', // dark: sem sombra
  error: '#EC8582',
  errorBg: '#2A1816',
  success: '#46B983',
  successBg: '#14261C',
  info: '#6BB5DE',
  infoBg: '#13232D',
  glassTint: 'rgba(32,29,26,0.78)',
  glassTintHover: 'rgba(32,29,26,0.88)',
  glassBorder: '#312D29',
  glassHighlight: 'rgba(255,255,255,0.05)',
  glassSolid: '#201D1A',
};

function makeType(f: ProtoFonts, c: ProtoColors): ProtoType {
  return {
    title: {
      fontFamily: f.display,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.4,
      color: c.text,
    },
    heading: { fontFamily: f.displayMedium, fontSize: 20, lineHeight: 26, color: c.text },
    name: { fontFamily: f.semibold, fontSize: 17, lineHeight: 22, color: c.text },
    body: { fontFamily: f.regular, fontSize: 15, lineHeight: 22, color: c.text },
    meta: { fontFamily: f.medium, fontSize: 13, lineHeight: 18, color: c.text2 },
    label: {
      fontFamily: f.semibold,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.2,
      color: c.text2,
    },
  };
}

export function vitrineTokens(scheme: Scheme): ProtoTokens {
  const c = scheme === 'dark' ? dark : light;
  return {
    id: 'vitrine',
    scheme,
    c,
    f: vitrineFonts,
    type: makeType(vitrineFonts, c),
    iconWeight: 'regular',
  };
}
