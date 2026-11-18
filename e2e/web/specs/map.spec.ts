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

// W4. Seed E2E do aecc-api (feat/mapa-api): 6 empresas no CP7 3000-000. No mapa: c004 (coletiva) e
// c005 (ENI com opt-in) exatas; c001, c002, c003 (ENI sem opt-in) em zona; c006 escondida pelo dono.
const C001 = 'e2e00000-0000-0000-0000-00000000c001'; // Pastelaria Conceição (ENI, zona), do associado
const C004 = 'e2e00000-0000-0000-0000-00000000c004'; // Livraria Atlântico (coletiva, exata)
const C006 = 'e2e00000-0000-0000-0000-00000000c006'; // Metalúrgica Mondego (escondida pelo dono)

test.describe('mapa: ecrã', () => {
  test('contagem, pinos exato/zona e filtro por categoria (com estado vazio)', async ({ page }) => {
    await login(page, USERS.cliente);
    await openMap(page);
    await expect(page.getByTestId('map.count')).toHaveText('5 empresas');

    // Pinos (lista acessível do mapa: o canvas não é legível por leitores de ecrã).
    await expect(page.getByTestId(`map.pin.${C001}`)).toHaveAttribute(
      'aria-label',
      /zona aproximada/,
    );
    await expect(page.getByTestId(`map.pin.${C004}`)).not.toHaveAttribute(
      'aria-label',
      /zona aproximada/,
    );
    await expect(page.getByTestId(`map.pin.${C006}`)).toHaveCount(0);

    await page.getByTestId('companies.category-chip-e2e-restauracao').click();
    await expect(page.getByTestId('map.count')).toHaveText('2 empresas');

    // Indústria: a única empresa está escondida → estado vazio com "Limpar filtro".
    await page.getByTestId('companies.category-chip-e2e-industria').click();
    await expect(page.getByTestId('map.empty')).toBeVisible();
    await page.getByTestId('map.empty.action').click();
    await expect(page.getByTestId('map.count')).toHaveText('5 empresas');
  });

  test('?company=<id> foca a empresa e abre a ficha; "Ver empresa" abre o detalhe', async ({
    page,
  }) => {
    await login(page, USERS.associado);
    await openMap(page, `/map?company=${C001}`);
    const card = page.getByTestId('map.card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Pastelaria Conceição');
    await expect(card).toContainText('Restauração');
    await expect(card).toContainText('Localização aproximada');
    await page.getByTestId('map.card.open').click();
    await expect(page).toHaveURL(new RegExp(`/companies/${C001}$`));
  });

  test('empresa com pino exato não mostra a nota de zona aproximada', async ({ page }) => {
    await login(page, USERS.cliente);
    await openMap(page, `/map?company=${C004}`);
    await expect(page.getByTestId('map.card')).toContainText('Livraria Atlântico');
    await expect(page.getByTestId('map.card')).not.toContainText('Localização aproximada');
  });

  test('cluster com folhas no mesmo ponto: tocar abre a lista do grupo (Review Focus 1)', async ({
    page,
  }) => {
    // c001, c002 e c003 (ENI sem opt-in) partilham o centróide CP4: o cluster nunca se desfaz.
    // `?company=` centra o mapa nesse ponto; sem animação, o cluster fica no centro do canvas.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page, USERS.cliente);
    await openMap(page, `/map?company=${C001}`);
    await expect(page.getByTestId('map.card')).toBeVisible();
    const group = page.getByTestId('map.group');
    // Clique real no canvas (o MapLibre pode ainda estar a desenhar os tiles: tenta de novo).
    await expect(async () => {
      await page.locator('.maplibregl-canvas').click();
      await expect(group).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await expect(group).toContainText('Pastelaria Conceição');
    await expect(group).toContainText('Restaurante Horizonte');
    await expect(group).toContainText('Óptica São João');
    await page.getByTestId(`map.group.item.${C001}`).click();
    await expect(page).toHaveURL(new RegExp(`/companies/${C001}$`));
  });

  test('erro da API mostra map.error e o retry recupera', async ({ page }) => {
    await login(page, USERS.cliente);
    await page.route('**/api/companies/map**', (r) => r.abort());
    await page.goto('/map');
    await expect(page.getByTestId('map.error')).toBeVisible();
    await page.unroute('**/api/companies/map**');
    await page.getByTestId('map.error').getByRole('button', { name: 'Tentar de novo' }).click();
    await expect(page.getByTestId('map.count')).toHaveText('5 empresas');
  });

  test('a resposta do /companies/map não traz a empresa escondida nem dados a mais', async ({
    page,
  }) => {
    await login(page, USERS.cliente);
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/companies/map',
    );
    await page.goto('/map');
    const body = (await (await response).json()) as Record<string, unknown>[];
    expect(body.length).toBe(5);
    expect(body.map((c) => c.id)).not.toContain(C006);
    for (const c of body) {
      expect(Object.keys(c).sort()).toEqual([
        'categoryId',
        'id',
        'lat',
        'lng',
        'name',
        'precision',
      ]);
    }
  });

  test('"Ver no mapa" no detalhe abre /map?company=<id> (não o Google Maps)', async ({ page }) => {
    await login(page, USERS.cliente);
    await page.goto(`/companies/${C004}`);
    await page.getByTestId('company-detail.address').click();
    await expect(page).toHaveURL(new RegExp(`/map\\?company=${C004}$`));
    await expect(page.getByTestId('map.card')).toContainText('Livraria Atlântico');
  });
});
