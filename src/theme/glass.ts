// Material único da Maré (fase3-plano §3.4), consumido pelo GlassSurface.
// As 5 variantes antigas (neutral/primary/gold/panel/heroPanel) saíram na B14.

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
