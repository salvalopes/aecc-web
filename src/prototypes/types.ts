import type { TextStyle } from 'react-native';

export type Scheme = 'light' | 'dark';
export type ProtoState = 'normal' | 'loading' | 'empty' | 'error';
export type ViewMode = 'primary' | 'table'; // primary = Grelha (A) / Lista (B)

export interface ProtoColors {
  bg: string;
  horizon: string;
  surface: string;
  sunken: string; // A: sunken · B: raised
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
  shadowTint: string;
  error: string;
  errorBg: string;
  success: string;
  successBg: string;
  info: string;
  infoBg: string;
  /** Vidro web: tint semi-opaco (+ backdropFilter). */
  glassTint: string;
  glassTintHover: string;
  glassBorder: string;
  glassHighlight: string;
  /** Vidro iOS < 26 / Reduce Transparency: superfície sólida. */
  glassSolid: string;
}

export interface ProtoFonts {
  display: string;
  displayMedium: string;
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
}

export interface ProtoType {
  title: TextStyle;
  heading: TextStyle;
  name: TextStyle;
  body: TextStyle;
  meta: TextStyle;
  label: TextStyle;
}

export interface ProtoTokens {
  id: 'vitrine' | 'mare';
  scheme: Scheme;
  c: ProtoColors;
  f: ProtoFonts;
  type: ProtoType;
  iconWeight: 'regular' | 'bold';
}

export interface ProtoCompany {
  id: string;
  name: string;
  tradeName: string | null;
  caeDescription: string | null;
  locality: string | null;
  logoUrl: string | null; // 'mock:<id>' → LogoMark local (sem rede)
  phone: string | null;
  website: string | null;
  /** Só do protótipo (não existe em CompanyDirectoryEntry): liga a empresa à categoria. */
  categorySlug: string;
}
