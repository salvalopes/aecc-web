// Fixture sintético do mapa para as capturas do refinamento (docs/design/mapa-refino.md).
// Nenhum dado real de empresas: nomes inventados, posições tiradas dos pontos CP7 do GISCO
// (o mesmo extrato que o aecc-api usa) e uma distribuição parecida com a de produção:
// 1523 empresas, 1487 em Cascais, 34 noutros concelhos dentro da caixa do mapa e 2 fora.
// ENI sem opt-in (~9%) saem como `area`, no centróide dos CP7 do CP4, como a API faz.
//
// Uso: node scripts/map/capture/build-fixture.mjs <pt-cp7.csv.gz> <saída-dir>
// Escreve <saída>/map.json (GET /companies/map) e <saída>/categories.json (GET /categories).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error('uso: build-fixture.mjs <pt-cp7.csv.gz> <saída-dir>');
  process.exit(2);
}

// RNG determinístico (mulberry32): o mesmo fixture em todas as corridas.
let seed = 20261119;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const byCp4 = new Map();
const csv = gunzipSync(readFileSync(src)).toString('utf8').split('\n').slice(1);
for (const line of csv) {
  if (!line) continue;
  const [code, lat, lng] = line.split(',');
  const cp4 = code.slice(0, 4);
  if (!byCp4.has(cp4)) byCp4.set(cp4, []);
  byCp4.get(cp4).push({ lat: Number(lat), lng: Number(lng) });
}

// Quantas empresas por CP4 (Cascais = 1487; dentro da caixa = 34; fora = 2).
const PLAN = [
  ['2750', 470], // Cascais
  ['2765', 265], // Estoril
  ['2775', 335], // Parede / Carcavelos
  ['2785', 250], // São Domingos de Rana
  ['2645', 120], // Alcabideche
  ['2755', 47], // Alcabideche (Malveira da Serra)
  ['2710', 6], // Sintra
  ['2635', 4], // Rio de Mouro
  ['2725', 3], // Mem Martins
  ['2780', 4], // Oeiras
  ['2790', 3], // Carnaxide
  ['2700', 3], // Amadora
  ['2720', 2], // Amadora
  ['1500', 3], // Lisboa (Benfica)
  ['1600', 2], // Lisboa
  ['1700', 2], // Lisboa (Alvalade)
  ['1050', 2], // Lisboa (Avenidas Novas)
  ['4000', 1], // Porto (fora da caixa)
  ['2900', 1], // Setúbal (fora da caixa)
];

const CATEGORIES = [
  ['construcao', 'Construção', 9],
  ['vestuario', 'Vestuário', 6],
  ['restaurantes', 'Restaurantes', 15],
  ['comercio-alimentar', 'Comércio Alimentar', 8],
  ['imobiliario', 'Imobiliário', 10],
  ['seguros', 'Seguros', 3],
  ['beleza-bem-estar', 'Beleza e Bem-estar', 9],
  ['pastelarias', 'Pastelarias', 5],
  ['outros', 'Outros', 7],
  ['saude', 'Saúde', 8],
  ['oficinas', 'Oficinas', 5],
  ['servicos-profissionais', 'Serviços Profissionais', 12],
  ['turismo-alojamento', 'Turismo e Alojamento', 3],
];
const categories = CATEGORIES.map(([slug, name], i) => ({
  id: `f1x00000-0000-0000-0000-0000000000${String(i + 1).padStart(2, '0')}`,
  name,
  slug: `fx-${slug}`,
  parentId: null,
  children: [],
}));
const weightTotal = CATEGORIES.reduce((n, c) => n + c[2], 0);
function pickCategory() {
  if (rand() < 0.014) return null; // algumas empresas sem categoria
  let r = rand() * weightTotal;
  for (let i = 0; i < CATEGORIES.length; i++) {
    r -= CATEGORIES[i][2];
    if (r <= 0) return categories[i].id;
  }
  return categories.at(-1).id;
}

const PREFIX = {
  'fx-construcao': ['Construções', 'Obras', 'Remodelações'],
  'fx-vestuario': ['Boutique', 'Atelier', 'Loja'],
  'fx-restaurantes': ['Restaurante', 'Tasca', 'Marisqueira', 'Casa de Pasto'],
  'fx-comercio-alimentar': ['Mercearia', 'Talho', 'Frutaria', 'Garrafeira'],
  'fx-imobiliario': ['Imobiliária', 'Mediação', 'Casas'],
  'fx-seguros': ['Seguros', 'Mediação de Seguros'],
  'fx-beleza-bem-estar': ['Cabeleireiro', 'Estética', 'Barbearia', 'Spa'],
  'fx-pastelarias': ['Pastelaria', 'Padaria', 'Confeitaria'],
  'fx-outros': ['Papelaria', 'Florista', 'Drogaria'],
  'fx-saude': ['Clínica', 'Farmácia', 'Fisioterapia', 'Ótica'],
  'fx-oficinas': ['Oficina', 'Auto', 'Pneus'],
  'fx-servicos-profissionais': ['Contabilidade', 'Advogados', 'Arquitetura', 'Consultoria'],
  'fx-turismo-alojamento': ['Guest House', 'Alojamento', 'Surf House'],
};
const SUFFIX = [
  'da Ribeira',
  'do Birre',
  'Quinta da Marinha',
  'da Torre',
  'do Monte Estoril',
  'Boca do Inferno',
  'São Pedro',
  'Bairro do Rosário',
  'Arneiro',
  'Murches',
  'Malveira',
  'Tires',
  'Abóboda',
  'Rebelva',
  'Bicesse',
  'Livramento',
  'Areia',
  'Guincho',
  'Galiza',
  'Sassoeiros',
  'Cobre',
  'Aldeia de Juzo',
  'Atlântico',
  'Maré Viva',
  'Farol',
  'Sol Nascente',
  'Costa Azul',
  'Pinhal',
  'Penedo',
  'Alvide',
];
const PEOPLE = [
  'Inês Carvalhal',
  'Rui Mendonça',
  'Teresa Abrunhosa',
  'Duarte Vilaça',
  'Matilde Seabra',
  'Gonçalo Brazão',
  'Leonor Quintela',
  'Vasco Ameixoeira',
  'Beatriz Lacerda',
  'Tomás Valadares',
  'Carlota Meireles',
  'Henrique Faria Lobo',
  'Madalena Pimentel',
  'Afonso Rebelo',
  'Joana Taveira',
];

const centroid = (pts) => ({
  lat: pts.reduce((n, p) => n + p.lat, 0) / pts.length,
  lng: pts.reduce((n, p) => n + p.lng, 0) / pts.length,
});
const round6 = (n) => Math.round(n * 1e6) / 1e6;

const points = [];
let n = 0;
for (const [cp4, count] of PLAN) {
  const cp7 = byCp4.get(cp4);
  if (!cp7 || cp7.length < 2) throw new Error(`CP4 ${cp4} sem pontos CP7 suficientes`);
  const area = centroid(cp7);
  for (let i = 0; i < count; i++) {
    n++;
    const categoryId = pickCategory();
    const slug = categories.find((c) => c.id === categoryId)?.slug ?? 'fx-outros';
    const eni = rand() < 0.09; // ENI sem opt-in → zona CP4
    const pos = eni ? area : pick(cp7);
    const name = eni
      ? `${pick(PEOPLE)} · ${pick(PREFIX[slug])}`
      : `${pick(PREFIX[slug])} ${pick(SUFFIX)}${rand() < 0.2 ? ` ${n}` : ''}`;
    points.push({
      id: `f1x00000-0000-0000-0000-${String(n).padStart(12, '0')}`,
      name,
      categoryId,
      lat: round6(pos.lat),
      lng: round6(pos.lng),
      precision: eni ? 'area' : 'exact',
    });
  }
}
points.sort((a, b) => a.name.localeCompare(b.name, 'pt'));

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'map.json'), JSON.stringify(points));
writeFileSync(join(out, 'categories.json'), JSON.stringify(categories));

const inBox = (p) => p.lat >= 38.62 && p.lat <= 38.86 && p.lng >= -9.52 && p.lng <= -9.1;
console.log(
  `${points.length} pontos · ${points.filter((p) => p.precision === 'area').length} zona · ` +
    `${points.filter((p) => !inBox(p)).length} fora da caixa · ${categories.length} categorias`,
);
