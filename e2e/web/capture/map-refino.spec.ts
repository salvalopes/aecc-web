import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { login, USERS } from '../helpers';

// Capturas e métricas do refinamento do mapa (docs/design/mapa-refino.md). Só com CAPTURE=1:
//   CAPTURE=1 E2E_TILES_DIR=<cópia local dos tiles> CAPTURE_FIXTURE=<dir> CAPTURE_DIRS=base \
//     CAPTURE_OUT=docs/design/mapa-refino/a0 npx playwright test --project=capture
// CAPTURE_FIXTURE: saída de scripts/map/capture/build-fixture.mjs (dados sintéticos, nenhum real).
// CAPTURE_DIRS: `base` (estado atual) ou `a,b` (direções do protótipo, `?dir=`).
// Escreve <out>/<dir>__<viewport>__<tema>__<card>.jpg e <out>/metrics.json.

const FIXTURE = path.resolve(process.env.CAPTURE_FIXTURE ?? '.artifacts/map-fixture');
const OUT = path.resolve(process.env.CAPTURE_OUT ?? '.artifacts/map-capture');
const DIRS = (process.env.CAPTURE_DIRS ?? 'base').split(',');
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const THEMES = ['light', 'dark'] as const;
// Empresa exata em Cascais (fixture) para o estado "card aberto" (via ?company=, como o detalhe).
const pickCompany = () => {
  const points = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'map.json'), 'utf8')) as {
    id: string;
    lat: number;
    lng: number;
    precision: string;
  }[];
  return points.find((p) => p.precision === 'exact' && p.lng < -9.41 && p.lat < 38.71)!.id;
};

async function routeFixture(page: Page) {
  const map = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'map.json'), 'utf8')) as {
    categoryId: string | null;
  }[];
  const categories = fs.readFileSync(path.join(FIXTURE, 'categories.json'), 'utf8');
  await page.route('**/api/companies/map*', (route) => {
    const categoryId = new URL(route.request().url()).searchParams.get('categoryId');
    const body = categoryId ? map.filter((p) => p.categoryId === categoryId) : map;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('**/api/categories', (route) =>
    route.fulfill({ contentType: 'application/json', body: categories }),
  );
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

test.describe.configure({ mode: 'serial' });

for (const dir of DIRS) {
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`${dir} ${vp.name} ${theme}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: theme,
        });
        const page = await context.newPage();
        // Regra 2: nenhum pedido fora da origem da app e da API (localhost faz de aecc.salv4.com).
        const foreign = new Set<string>();
        page.on('request', (r) => {
          const host = new URL(r.url()).hostname;
          if (!['localhost', '127.0.0.1'].includes(host) && !r.url().startsWith('data:')) {
            foreign.add(host);
          }
        });
        await routeFixture(page);
        await login(page, USERS.associado);
        const q = dir === 'base' ? '' : `dir=${dir}`;
        fs.mkdirSync(OUT, { recursive: true });

        for (const card of ['fechado', 'aberto'] as const) {
          const params = [q, card === 'aberto' ? `company=${pickCompany()}` : '']
            .filter(Boolean)
            .join('&');
          await page.goto(`/map${params ? `?${params}` : ''}`);
          await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });
          if (card === 'aberto') await expect(page.getByTestId('map.card')).toBeVisible();
          // Tiles, glyphs e o flyTo do ?company= (≈ 2 s) assentam.
          await page.waitForTimeout(4_000);
          const name = `${dir}__${vp.name}__${theme}__card-${card}`;
          await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 78 });
          metrics[name] = await mapArea(page);

          if (dir !== 'base' && card === 'fechado') {
            // Regra 3 (OSMF §1.5.2): recolhe ao fim de 5 s, fica o "(i)"; o GISCO não recolhe.
            await expect(page.getByTestId('map.attribution.info')).toBeVisible({ timeout: 3_000 });
            await expect(page.getByTestId('map.attribution.gisco')).toBeVisible();
            const folded = `${dir}__${vp.name}__${theme}__atribuicao-recolhida`;
            await page.screenshot({
              path: path.join(OUT, `${folded}.jpg`),
              type: 'jpeg',
              quality: 78,
            });
            metrics[folded] = await mapArea(page);
            // O "(i)" volta a abrir; o "x" recolhe logo (sem esperar).
            await page.getByTestId('map.attribution.info').click();
            await expect(page.getByTestId('map.attribution.close')).toBeVisible();
            await page.getByTestId('map.attribution.close').click();
            await expect(page.getByTestId('map.attribution.info')).toBeVisible();
            // Teclado: Esc fecha a ficha.
          }
          if (dir !== 'base' && card === 'aberto') {
            await page.keyboard.press('Escape');
            await expect(page.getByTestId('map.card')).toBeHidden();
          }
        }
        expect([...foreign]).toEqual([]);
        await context.close();
      });
    }
  }
}

test.afterAll(() => {
  const file = path.join(OUT, 'metrics.json');
  const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  fs.writeFileSync(file, JSON.stringify({ ...previous, ...metrics }, null, 2) + '\n');
});
