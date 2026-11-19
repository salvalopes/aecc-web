// Verifica os estilos gerados (mapa-plano W2): valida com @maplibre/maplibre-gl-style-spec e
// confirma que todas as cores são da paleta Maré do tema. Sai com erro se falhar.
//   node scripts/map/check-styles.mjs
import { readFileSync } from 'node:fs';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { mareDark, mareLight } from '../../src/theme/palette.ts';

let failed = false;
for (const [scheme, palette] of [
  ['light', mareLight],
  ['dark', mareDark],
]) {
  const { layers } = JSON.parse(
    readFileSync(new URL(`../../src/components/map/styles/mare-${scheme}.json`, import.meta.url)),
  );
  // Fonte e URLs de exemplo: só para a validação; em runtime vêm de buildMapStyle().
  const style = {
    version: 8,
    glyphs: 'https://example.invalid/fonts/{fontstack}/{range}.pbf',
    sprite: 'https://example.invalid/sprites/v4/' + scheme,
    sources: { protomaps: { type: 'vector', url: 'pmtiles://https://example.invalid/x.pmtiles' } },
    layers,
  };
  const errors = validateStyleMin(style);
  const allowed = new Set(Object.values(palette).map((c) => c.toLowerCase()));
  const used = new Set(
    (JSON.stringify(layers).match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) ?? []).map(
      (c) => c.toLowerCase(),
    ),
  );
  const foreign = [...used].filter((c) => !allowed.has(c));
  console.log(
    `${scheme}: ${layers.length} layers, ${errors.length} erros de validação, ` +
      `${used.size} cores usadas, ${foreign.length} fora da paleta`,
  );
  for (const e of errors) console.log('  ', e.message);
  for (const c of foreign) console.log('   fora da paleta:', c);
  if (errors.length || foreign.length) failed = true;
}
process.exit(failed ? 1 : 0);
