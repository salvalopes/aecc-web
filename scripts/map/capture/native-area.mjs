#!/usr/bin/env node
// Área do mapa visível nas capturas nativas (docs/design/mapa-refino.md, tabela da área).
// Lê a hierarquia guardada com cada captura por native-shots.sh, no mesmo instante:
// - Android: `uiautomator dump` (XML, píxeis);
// - iOS: `maestro hierarchy` (JSON, pontos).
// Mapa visível = ecrã ∩ `map.view` menos a união das superfícies que flutuam por cima (título,
// botão de posição, chips, legenda, atribuição, ficha, avisos) e da tab bar. A status bar conta
// como mapa (o mapa vê-se por baixo dela), como no web o canvas por baixo de nada.
// Uso: node scripts/map/capture/native-area.mjs <dir-das-capturas>  → imprime e grava area.json
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('uso: native-area.mjs <dir>');
  process.exit(2);
}

// Superfícies opacas por cima do mapa (testID). Os chips contam um a um (entre eles vê-se o mapa).
const OVERLAY = [
  /^map\.title$/,
  /^map\.locate$/,
  /^companies\.category-chip-/,
  /^map\.legend-box$/,
  /^map\.attribution\.(osm|info|gisco|details)$/,
  /^map\.sheet$/,
  /^map\.(locate\.denied|locate\.unavailable|company-missing)$/,
];
const TABS = ['Início', 'Empresas', 'Mapa', 'Editar', 'Perfil', 'Gestão'];

const rect = (b) => {
  const m = b.match(/\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/);
  return m ? { x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4] } : null;
};

function fromAndroid(xml) {
  const nodes = [...xml.matchAll(/<node [^>]*>/g)].map((m) => {
    const n = m[0];
    const get = (k) => (n.match(new RegExp(`${k}="([^"]*)"`)) ?? [])[1] ?? '';
    return { id: get('resource-id'), text: get('text'), b: rect(get('bounds')) };
  });
  return { nodes, tabBar: tabBarOf(nodes) };
}

/** Tab bar: o menor nó que contém todos os rótulos das tabs (no fundo do ecrã). */
function tabBarOf(nodes) {
  // (Só no fundo: o título "Mapa" também tem o texto de uma tab.)
  // Ecrã = `map.screen` (há nós fora do ecrã, ex.: o conteúdo dos chips que faz scroll).
  const screen = nodes.find((n) => n.id === 'map.screen')?.b;
  if (!screen) return undefined;
  const bottom = screen.y1;
  const labels = nodes.filter((n) => TABS.includes(n.text) && n.b && n.b.y0 > bottom * 0.75);
  if (!labels.length) return undefined;
  const contains = (o, i) => o.x0 <= i.x0 && o.y0 <= i.y0 && o.x1 >= i.x1 && o.y1 >= i.y1;
  const area = (r) => (r.x1 - r.x0) * (r.y1 - r.y0);
  const width = screen.x1 - screen.x0;
  return nodes
    .filter((n) => n.b && labels.every((l) => contains(n.b, l.b)) && n.b.y0 > bottom * 0.5)
    .sort((p, q) => area(p.b) - area(q.b))
    .map((n) => n.b)
    .find((r) => r.x1 - r.x0 >= width * 0.8);
}

function fromIos(json) {
  const nodes = [];
  const walk = (n, parent) => {
    const a = n.attributes ?? {};
    const node = {
      id: a['resource-id'] ?? '',
      text: a.text || a.accessibilityText || '',
      b: rect(a.bounds ?? ''),
      children: [],
    };
    nodes.push(node);
    parent?.children.push(node);
    for (const c of n.children ?? []) walk(c, node);
  };
  walk(json, null);
  return { nodes, tabBar: tabBarOf(nodes) };
}

function measure(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const { nodes, tabBar } = raw.trimStart().startsWith('<')
    ? fromAndroid(raw)
    : fromIos(JSON.parse(raw));
  const mapView = nodes.find((n) => n.id === 'map.view')?.b;
  if (!mapView) return null;
  // Ecrã = `map.screen` (de ponta a ponta no nativo; há nós fora do ecrã).
  const screen = nodes.find((n) => n.id === 'map.screen')?.b;
  if (!screen) return null;
  const covers = nodes
    .filter((n) => n.b && OVERLAY.some((re) => re.test(n.id)))
    .map((n) => n.b)
    .concat(tabBar ? [{ ...tabBar, y1: screen.y1 }] : []);
  const step = screen.x1 - screen.x0 > 600 ? 4 : 2;
  let total = 0;
  let visible = 0;
  for (let y = screen.y0 + step / 2; y < screen.y1; y += step) {
    for (let x = screen.x0 + step / 2; x < screen.x1; x += step) {
      total++;
      const inMap = x >= mapView.x0 && x < mapView.x1 && y >= mapView.y0 && y < mapView.y1;
      if (!inMap) continue;
      if (covers.some((r) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1)) continue;
      visible++;
    }
  }
  return {
    visible: Math.round((visible / total) * 1000) / 10,
    tabBarTop: tabBar?.y0 ?? null,
    screenHeight: screen.y1 - screen.y0,
  };
}

const out = {};
for (const f of fs.readdirSync(dir).filter((f) => /\.(xml|json)$/.test(f) && f !== 'area.json')) {
  const r = measure(path.join(dir, f));
  if (r) out[f.replace(/\.(xml|json)$/, '')] = r;
}
for (const [k, v] of Object.entries(out)) console.log(`${String(v.visible).padStart(5)} %  ${k}`);
fs.writeFileSync(path.join(dir, 'area.json'), JSON.stringify(out, null, 2) + '\n');
