// Gera os estilos Maré claro/escuro do mapa (mapa-plano §2.2, W2) a partir de src/theme/palette.ts.
//   node scripts/map/build-styles.mjs
// Saída: src/components/map/styles/mare-{light,dark}.json, só `layers` (versionados). O URL dos tiles,
// glyphs e sprites é injetado em runtime por buildMapStyle(). O mapa não usa cores fora da paleta:
// TODAS as cores do flavor Protomaps são substituídas por papéis da Maré (o `accent` fica para os
// pinos). Requer Node ≥ 23 (importa o .ts com type stripping).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layers, namedFlavor } from '@protomaps/basemaps';
import { mareDark, mareLight } from '../../src/theme/palette.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(root, 'src', 'components', 'map', 'styles');

/** Papéis da Maré → chaves de cor do flavor Protomaps 5.x. */
function mareFlavor(base, p) {
  const land = p.bg;
  const green = p.raised; // parques e vegetação: um degrau acima da terra
  const built = p.surface; // edifícios, pistas, cais
  const road = p.surface;
  const casing = p.border;
  const label = p.text2;
  const halo = p.bg;
  return {
    ...namedFlavor(base),
    background: land,
    earth: land,
    park_a: green,
    park_b: green,
    hospital: green,
    industrial: land,
    school: green,
    wood_a: green,
    wood_b: green,
    pedestrian: built,
    scrub_a: green,
    scrub_b: green,
    glacier: built,
    sand: green,
    beach: green,
    aerodrome: green,
    runway: built,
    water: p.horizon,
    zoo: green,
    military: land,
    tunnel_other_casing: casing,
    tunnel_minor_casing: casing,
    tunnel_link_casing: casing,
    tunnel_major_casing: casing,
    tunnel_highway_casing: casing,
    tunnel_other: p.raised,
    tunnel_minor: p.raised,
    tunnel_link: p.raised,
    tunnel_major: p.raised,
    tunnel_highway: p.raised,
    pier: built,
    buildings: p.border,
    minor_service_casing: casing,
    minor_casing: casing,
    link_casing: casing,
    major_casing_late: casing,
    highway_casing_late: casing,
    other: road,
    minor_service: road,
    minor_a: road,
    minor_b: road,
    link: road,
    major_casing_early: casing,
    major: road,
    highway_casing_early: casing,
    highway: road,
    railway: p.border,
    boundaries: p.text3,
    bridges_other_casing: casing,
    bridges_minor_casing: casing,
    bridges_link_casing: casing,
    bridges_major_casing: casing,
    bridges_highway_casing: casing,
    bridges_other: road,
    bridges_minor: road,
    bridges_link: road,
    bridges_major: road,
    bridges_highway: road,
    roads_label_minor: label,
    roads_label_minor_halo: halo,
    roads_label_major: label,
    roads_label_major_halo: halo,
    ocean_label: p.text3,
    subplace_label: label,
    subplace_label_halo: halo,
    city_label: p.text,
    city_label_halo: halo,
    state_label: p.text3,
    state_label_halo: halo,
    country_label: p.text3,
    address_label: p.text3,
    address_label_halo: halo,
    pois: {
      blue: p.text3,
      green: p.text3,
      lapis: p.text3,
      pink: p.text3,
      red: p.text3,
      slategray: p.text3,
      tangerine: p.text3,
      turquoise: p.text3,
    },
    landcover: {
      barren: land,
      farmland: land,
      forest: green,
      glacier: built,
      grassland: green,
      scrub: green,
      urban_area: land,
    },
  };
}

mkdirSync(outDir, { recursive: true });
for (const [scheme, palette] of [
  ['light', mareLight],
  ['dark', mareDark],
]) {
  const style = { layers: layers('protomaps', mareFlavor(scheme, palette), { lang: 'pt' }) };
  const file = join(outDir, `mare-${scheme}.json`);
  writeFileSync(file, JSON.stringify(style, null, 1) + '\n');
  console.log(`${file.slice(root.length + 1)}: ${style.layers.length} layers`);
}
