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

test('regra 7: sem sessão, /map vai para o login (e não pede o mapa)', async ({ page }) => {
  const mapRequests: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (url.includes('/companies/map') || url.includes('/tiles/')) mapRequests.push(url);
  });
  await page.goto('/map');
  await expect(page.getByTestId('login.screen')).toBeVisible();
  expect(mapRequests).toEqual([]);
});

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

// W5. Posição simulada com casas decimais distintivas (sem falsos positivos nas pesquisas).
const SIM = { latitude: 38.7123456, longitude: -9.4198765 };
const SIM_TRACES = ['38.7123', '9.41987', '38,7123', '9,41987'];

// Conta as chamadas à API de geolocalização do browser (regra 1: só depois do toque no botão).
async function instrumentGeolocation(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __geo: { get: number; watch: number } };
    w.__geo = { get: 0, watch: 0 };
    const geo = navigator.geolocation;
    if (!geo) return;
    const get = geo.getCurrentPosition.bind(geo);
    const watch = geo.watchPosition.bind(geo);
    geo.getCurrentPosition = (...args: Parameters<Geolocation['getCurrentPosition']>) => {
      w.__geo.get += 1;
      return get(...args);
    };
    geo.watchPosition = (...args: Parameters<Geolocation['watchPosition']>) => {
      w.__geo.watch += 1;
      return watch(...args);
    };
  });
}
const geoCalls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __geo: { get: number; watch: number } }).__geo);

test.describe('mapa: a minha posição (regras 1 e 2)', () => {
  test('a posição só é lida ao tocar no botão e nunca sai do dispositivo', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(SIM);
    await instrumentGeolocation(page);

    // Regra 2: nenhum pedido (API, tiles, glyphs, sprites, chunks) leva as coordenadas.
    const leaks: string[] = [];
    page.on('request', (r) => {
      const blob = [r.url(), r.postData() ?? '', JSON.stringify(r.headers())].join('\n');
      if (SIM_TRACES.some((t) => blob.includes(t))) leaks.push(`${r.method()} ${r.url()}`);
    });
    const consoleLines: string[] = [];
    page.on('console', (m) => consoleLines.push(m.text()));

    await login(page, USERS.cliente);
    await openMap(page);
    await expect(page.getByTestId('map.count')).toHaveText('5 empresas');

    // Regra 1: nada de geolocalização no arranque do ecrã.
    expect(await geoCalls(page)).toEqual({ get: 0, watch: 0 });
    await expect(page.getByTestId('map.me')).toHaveCount(0);

    await page.getByTestId('map.locate').click();
    await expect(page.getByTestId('map.me')).toBeAttached();
    await expect(page.getByTestId('map.me')).toHaveAttribute(
      'aria-label',
      'A sua posição está no mapa',
    );
    expect(await geoCalls(page)).toEqual({ get: 1, watch: 0 });

    // Mexer no mapa depois (filtro → novo GET /companies/map) também não leva a posição.
    await page.getByTestId('companies.category-chip-e2e-restauracao').click();
    await expect(page.getByTestId('map.count')).toHaveText('2 empresas');
    await page.waitForLoadState('networkidle');

    expect(leaks).toEqual([]);
    // Nem storage nem logs.
    const stored = await page.evaluate(() =>
      JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
    );
    expect(SIM_TRACES.some((t) => stored.includes(t))).toBe(false);
    expect(consoleLines.filter((l) => SIM_TRACES.some((t) => l.includes(t)))).toEqual([]);

    // Voltar a tocar esconde a posição (fica só em memória e é descartada).
    await page.getByTestId('map.locate').click();
    await expect(page.getByTestId('map.me')).toHaveCount(0);
  });

  test('sem permissão: aviso "sem acesso" e o mapa continua utilizável', async ({
    page,
    context,
  }) => {
    await context.clearPermissions();
    await instrumentGeolocation(page);
    await login(page, USERS.cliente);
    await openMap(page);

    await page.getByTestId('map.locate').click();
    await expect(page.getByTestId('map.locate.denied')).toBeVisible();
    await expect(page.getByTestId('map.locate.denied')).toContainText('Sem acesso à localização');
    await expect(page.getByTestId('map.me')).toHaveCount(0);

    await page.getByTestId('companies.category-chip-e2e-comercio').click();
    await expect(page.getByTestId('map.count')).toHaveText('2 empresas');
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
