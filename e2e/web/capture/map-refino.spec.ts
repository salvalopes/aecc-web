import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { login, USERS } from '../helpers';

// Capturas e métricas do refinamento do mapa (docs/design/mapa-refino.md). Só com CAPTURE=1 e fora
// do gate (as regras que estas capturas mostram estão provadas em e2e/web/specs/map-rules.spec.ts):
//   CAPTURE=1 E2E_TILES_DIR=<cópia local dos tiles> CAPTURE_FIXTURE=<dir> \
//     CAPTURE_OUT=docs/design/mapa-refino/b npx playwright test --project=capture
// CAPTURE_FIXTURE: saída de scripts/map/capture/build-fixture.mjs (dados sintéticos, nenhum real).
// Escreve <out>/web__<viewport>__<tema>__<estado>.jpg e <out>/metrics.json.
// CAPTURE_SET=ajuste-mobile (docs/design/mapa-refino.md, "Ajuste mobile"): só o telemóvel, 390 em
// claro e escuro e 360 em escuro (pior caso: atribuição da OSM aberta, só "card-fechado").

const FIXTURE = path.resolve(process.env.CAPTURE_FIXTURE ?? '.artifacts/map-fixture');
const OUT = path.resolve(process.env.CAPTURE_OUT ?? '.artifacts/map-capture');
const PREFIX = process.env.CAPTURE_PREFIX ?? 'web';
type Theme = 'light' | 'dark';
type Viewport = { name: string; width: number; height: number; themes: Theme[]; only?: string };
const BOTH: Theme[] = ['light', 'dark'];
const VIEWPORTS: Viewport[] =
  process.env.CAPTURE_SET === 'ajuste-mobile'
    ? [
        { name: 'mobile', width: 390, height: 844, themes: BOTH },
        { name: 'mobile360', width: 360, height: 800, themes: ['dark'], only: 'card-fechado' },
      ]
    : [
        { name: 'desktop', width: 1440, height: 900, themes: BOTH },
        { name: 'mobile', width: 390, height: 844, themes: BOTH },
      ];

type FixturePoint = {
  id: string;
  name: string;
  categoryId: string | null;
  lat: number;
  lng: number;
  precision: string;
};
const fixture = () =>
  JSON.parse(fs.readFileSync(path.join(FIXTURE, 'map.json'), 'utf8')) as FixturePoint[];

// Empresa exata em Cascais (fixture) para o estado "card aberto" (via ?company=, como o detalhe).
const pickCompany = () =>
  fixture().find((p) => p.precision === 'exact' && p.lng < -9.41 && p.lat < 38.71)!.id;
// Empresa em zona (ENI sem opt-in) em Cascais, para mostrar o símbolo fixo da zona.
const pickZone = () =>
  fixture().find((p) => p.precision === 'area' && p.lng < -9.41 && p.lat < 38.71)!.id;

async function routeFixture(page: Page) {
  const map = fixture();
  const byId = new Map(map.map((p) => [p.id, p]));
  const categories = fs.readFileSync(path.join(FIXTURE, 'categories.json'), 'utf8');
  await page.route('**/api/companies/map*', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(map) }),
  );
  await page.route('**/api/categories', (route) =>
    route.fulfill({ contentType: 'application/json', body: categories }),
  );
  // Detalhe sintético (a ficha só lê a localidade): as empresas do fixture não existem na API.
  await page.route(/\/api\/companies\/[0-9a-z-]{36}$/, (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop()!;
    const p = byId.get(id);
    if (!p) return route.continue();
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ id, name: p.name, locality: 'Cascais', postalCodeLocality: null }),
    });
  });
}

/** % do viewport em que o elemento de topo é o canvas do mapa (grelha de 8 px). */
async function mapArea(page: Page) {
  return page.evaluate(() => {
    const step = 8;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const canvas = document.querySelector('.maplibregl-canvas');
    if (!canvas) return { canvas: 0, visible: 0 };
    const r = canvas.getBoundingClientRect();
    const ix = Math.max(0, Math.min(r.right, w) - Math.max(r.left, 0));
    const iy = Math.max(0, Math.min(r.bottom, h) - Math.max(r.top, 0));
    let hit = 0;
    let total = 0;
    for (let y = step / 2; y < h; y += step) {
      for (let x = step / 2; x < w; x += step) {
        total++;
        if (document.elementFromPoint(x, y) === canvas) hit++;
      }
    }
    return {
      canvas: Math.round(((ix * iy) / (w * h)) * 1000) / 10,
      visible: Math.round((hit / total) * 1000) / 10,
    };
  });
}

const metrics: Record<string, unknown> = {};

test.describe.configure({ mode: 'serial', timeout: 120_000 });

for (const vp of VIEWPORTS) {
  for (const theme of vp.themes) {
    test(`${vp.name} ${theme}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme,
      });
      const page = await context.newPage();
      await routeFixture(page);
      await login(page, USERS.associado);
      fs.mkdirSync(OUT, { recursive: true });
      const shot = async (state: string) => {
        const name = `${PREFIX}__${vp.name}__${theme}__${state}`;
        await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 78 });
        metrics[name] = await mapArea(page);
      };

      // Card fechado: atribuição da OSM aberta (captura aos 3,5 s, antes de recolher aos 5 s).
      await page.goto('/map');
      await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(3_500);
      await shot('card-fechado');
      if (vp.only) return context.close();
      // Atribuição recolhida: só o GISCO curto e o "(i)".
      await expect(page.getByTestId('map.attribution.info')).toBeVisible({ timeout: 5_000 });
      await shot('atribuicao-recolhida');

      // Card aberto (?company=, como o "Ver no mapa" do detalhe): pino selecionado com o anel.
      await page.goto(`/map?company=${pickCompany()}`);
      await expect(page.getByTestId('map.card')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('map.card.locality')).toHaveText('Cascais');
      // flyTo + aproximação até o cluster se desfazer, e os tiles assentam.
      await page.waitForTimeout(5_000);
      await shot('card-aberto');

      // Só no desktop: ficha de uma empresa em zona (anel tracejado de tamanho fixo, nunca ponto).
      if (vp.name === 'desktop') {
        await page.goto(`/map?company=${pickZone()}`);
        await expect(page.getByTestId('map.card.area')).toBeVisible({ timeout: 30_000 });
        await page.waitForTimeout(5_000);
        await shot('card-aberto-zona');
      }
      await context.close();
    });
  }
}

test.afterAll(() => {
  const file = path.join(OUT, 'metrics.json');
  const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  fs.writeFileSync(file, JSON.stringify({ ...previous, ...metrics }, null, 2) + '\n');
});
