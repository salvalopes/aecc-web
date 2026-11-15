// B · Maré — noite atlântica, dark-first. Acento único: dourado #DCAA45. Neutros: escada fria.
import type { ProtoColors, ProtoFonts, ProtoTokens, ProtoType, Scheme } from '../types';

export const mareFonts: ProtoFonts = {
  display: 'Geist_700Bold',
  displayMedium: 'Geist_600SemiBold',
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
};

export const mareFontFiles = {
  Geist_400Regular: require('../../../assets/fonts/prototypes/geist/Geist-Regular.ttf'),
  Geist_500Medium: require('../../../assets/fonts/prototypes/geist/Geist-Medium.ttf'),
  Geist_600SemiBold: require('../../../assets/fonts/prototypes/geist/Geist-SemiBold.ttf'),
  Geist_700Bold: require('../../../assets/fonts/prototypes/geist/Geist-Bold.ttf'),
};

const dark: ProtoColors = {
  bg: '#08161F',
  horizon: '#0E2D42',
  surface: '#0F2433',
  sunken: '#15303F', // raised
  border: '#23404F',
  text: '#EEF3F6',
  text2: '#9FB4C1',
  text3: '#7590A0',
  accent: '#DCAA45',
  accentPressed: '#C6973A',
  accentText: '#DCAA45',
  onAccent: '#0B1A23',
  accentSoft: '#33290F',
  accentSoftText: '#DCAA45',
  logoPlate: '#F6F8FA',
  shadowTint: 'rgba(2,10,16,0.45)',
  error: '#EC8582',
  errorBg: '#3A1A19',
  success: '#46B983',
  successBg: '#0F2E22',
  info: '#6BB5DE',
  infoBg: '#0D2C40',
  glassTint: 'rgba(15,36,51,0.55)',
  glassTintHover: 'rgba(15,36,51,0.61)',
  glassBorder: 'rgba(255,255,255,0.10)',
  glassHighlight: 'rgba(255,255,255,0.08)',
  glassSolid: '#15303F',
};

const light: ProtoColors = {
  bg: '#EEF2F5',
  horizon: '#D6E2EA',
  surface: '#FFFFFF',
  sunken: '#F6F8FA',
  border: '#D5DEE5',
  text: '#0B1E2A',
  text2: '#4A5D69',
  text3: '#5A6D7A',
  accent: '#DCAA45',
  accentPressed: '#C6973A',
  accentText: '#85600F',
  onAccent: '#0B1E2A',
  accentSoft: '#F7EBCB',
  accentSoftText: '#85600F',
  logoPlate: '#FFFFFF',
  shadowTint: 'rgba(11,30,42,0.10)',
  error: '#C4302E',
  errorBg: '#FBEAE8',
  success: '#1D7A4C',
  successBg: '#E7F3EC',
  info: '#2479A8',
  infoBg: '#E6F1F8',
  glassTint: 'rgba(255,255,255,0.62)',
  glassTintHover: 'rgba(255,255,255,0.68)',
  glassBorder: 'rgba(11,30,42,0.08)',
  glassHighlight: 'rgba(255,255,255,0.8)',
  glassSolid: '#F6F8FA',
};

function makeType(f: ProtoFonts, c: ProtoColors): ProtoType {
  return {
    title: {
      fontFamily: f.display,
      fontSize: 30,
      lineHeight: 34,
      letterSpacing: -0.6,
      color: c.text,
    },
    heading: { fontFamily: f.semibold, fontSize: 20, lineHeight: 26, color: c.text },
    name: { fontFamily: f.semibold, fontSize: 16, lineHeight: 22, color: c.text },
    body: { fontFamily: f.regular, fontSize: 15, lineHeight: 22, color: c.text },
    meta: { fontFamily: f.medium, fontSize: 13, lineHeight: 18, color: c.text2 },
    label: {
      fontFamily: f.semibold,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
      color: c.text2,
    },
  };
}

export function mareTokens(scheme: Scheme): ProtoTokens {
  const c = scheme === 'dark' ? dark : light;
  return { id: 'mare', scheme, c, f: mareFonts, type: makeType(mareFonts, c), iconWeight: 'bold' };
}
