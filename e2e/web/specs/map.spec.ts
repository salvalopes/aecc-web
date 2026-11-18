import { expect, test, type Page, type Request } from '@playwright/test';
import { API_URL, login, USERS } from '../helpers';

// Mapa de empresas (mapa-plano W3–W5). Tiles, glyphs e sprites vêm da fixture local
// (e2e/web/fixtures/tiles, servida pelo serve-static em /tiles), nunca do servidor de produção.

const APP_ORIGIN = 'http://localhost:8081';
const API_ORIGIN = new URL(API_URL).origin;

const OSM = '© OpenStreetMap · Protomaps';
const GISCO = '© European Union - GISCO, 2024, postal code point dataset, Licence CC-BY-SA 4.0.';

async function openMap(page: Page, path = '/map') {
  await page.goto(path);
  await expect(page.getByTestId('map.screen')).toBeVisible();
  await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 20_000 });
}

test.describe('mapa: componente', () => {
  test('mostra o mapa, pede o PMTiles por Range e a atribuição está sempre visível', async ({
    page,
  }) => {
    await login(page, USERS.associado);
    const pmtiles = page.waitForRequest(
      (r) => r.url() === `${APP_ORIGIN}/tiles/cascais.pmtiles` && !!r.headers()['range'],
    );
    await openMap(page);
    await pmtiles;

    // Regra 5: OSM · Protomaps e o agradecimento oficial do GISCO (texto do NOTICE do aecc-api).
    const attribution = page.getByTestId('map.attribution');
    await expect(attribution).toBeVisible();
    await expect(attribution).toContainText(OSM);
    await expect(attribution).toContainText(GISCO);
    // A atribuição própria do maplibre-gl fica desligada (não duplica).
    await expect(page.locator('.maplibregl-ctrl-attrib')).toHaveCount(0);
  });

  test('regra 4: o maplibre-gl e o ecrã do mapa só são pedidos ao abrir /map (lazy)', async ({
    page,
  }) => {
    const chunks: string[] = [];
    page.on('request', (r) => {
      const name = new URL(r.url()).pathname.split('/').pop() ?? '';
      if (/^(MapScreen|CompanyMap)-.*\.js$/.test(name)) chunks.push(name);
    });
    await login(page, USERS.associado);
    // Nem o documento inicial nem o diretório carregam o mapa (JS ou a folha do maplibre-gl).
    expect(chunks).toEqual([]);
    await expect(
      page.locator('link[href*="maplibre"], style[data-aecc="maplibre-gl"]'),
    ).toHaveCount(0);

    await page.getByTestId('tab.map').click();
    await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 20_000 });
    expect(chunks.some((c) => c.startsWith('MapScreen-'))).toBe(true);
    expect(chunks.some((c) => c.startsWith('CompanyMap-'))).toBe(true);
  });

  test('regra 3: no ecrã do mapa só se pedem a nossa origem e a API (sem domínios externos)', async ({
    page,
  }) => {
    await login(page, USERS.associado);
    const origins = new Set<string>();
    const record = (r: Request) => {
      const url = new URL(r.url());
      if (url.protocol === 'http:' || url.protocol === 'https:') origins.add(url.origin);
    };
    page.on('request', record);
    await openMap(page);
    // Dá tempo aos tiles, glyphs e sprites.
    await page.waitForLoadState('networkidle');
    page.off('request', record);

    console.log(`origens pedidas no ecrã do mapa: ${[...origins].sort().join(', ')}`);
    expect([...origins].sort()).toEqual([...new Set([APP_ORIGIN, API_ORIGIN])].sort());
  });
});
