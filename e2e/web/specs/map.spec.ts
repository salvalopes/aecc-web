import { expect, test, type Page, type Request } from '@playwright/test';
import { API_URL, login, USERS } from '../helpers';

// Mapa de empresas (mapa-plano W3–W5). Tiles, glyphs e sprites vêm da fixture local
// (e2e/web/fixtures/tiles, servida pelo serve-static em /tiles), nunca do servidor de produção.

const APP_ORIGIN = 'http://localhost:8081';
const API_ORIGIN = new URL(API_URL).origin;

const OSM = '© OpenStreetMap · Protomaps';
const GISCO_SHORT = 'Posições © EU GISCO';

/**
 * Centro da área livre do mapa no desktop (onde o `?company=` põe a empresa): à direita do painel,
 * à esquerda do botão de posição e acima da atribuição, com as margens de 16 do `MapScreen`.
 */
async function focusPoint(page: Page): Promise<[number, number]> {
  const box = async (id: string) => (await page.getByTestId(id).boundingBox())!;
  const canvas = (await page.locator('.maplibregl-canvas').boundingBox())!;
  const panel = await box('map.panel');
  const locate = await box('map.locate');
  const attribution = await box('map.attribution');
  const left = panel.x + panel.width + 16;
  const right = locate.x - 16;
  const top = canvas.y + 16;
  const bottom = attribution.y - 16;
  return [(left + right) / 2, (top + bottom) / 2];
}

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
  test('mostra o mapa, pede o PMTiles por Range e a atribuição está visível à entrada', async ({
    page,
  }) => {
    await login(page, USERS.associado);
    const pmtiles = page.waitForRequest(
      (r) => r.url() === `${APP_ORIGIN}/tiles/cascais.pmtiles` && !!r.headers()['range'],
    );
    await openMap(page);
    await pmtiles;

    // Decisão 2 da Fase B: OSM · Protomaps à entrada (recolhe depois) e a forma curta do GISCO.
    // As regras de recolher e o "(i)" estão em map-rules.spec.ts.
    const attribution = page.getByTestId('map.attribution');
    await expect(attribution).toBeVisible();
    await expect(attribution).toContainText(OSM);
    await expect(page.getByTestId('map.attribution.gisco')).toHaveText(GISCO_SHORT);
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

  test('regra 4: os scripts que o index.html carrega não têm código do maplibre-gl nem do pmtiles', async ({
    request,
  }) => {
    const html = await (await request.get(`${APP_ORIGIN}/`)).text();
    const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);
    // Marcadores das duas bibliotecas (classe criada pelo maplibre-gl e erro do leitor PMTiles).
    const markers = ['maplibregl-canvas-container', 'Wrong magic number for PMTiles'];
    for (const src of scripts) {
      const js = await (await request.get(`${APP_ORIGIN}${src}`)).text();
      for (const marker of markers) expect(js, `${src} contém "${marker}"`).not.toContain(marker);
    }
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

// Ajuste mobile (docs/design/mapa-refino.md, "Ajuste mobile"): sem a cápsula do título, os chips são
// a 1.ª linha; em baixo, o botão de posição à direita, logo acima da faixa com a legenda à esquerda e
// a atribuição no canto inferior direito.
test.describe('mapa: telemóvel', () => {
  type Box = { x: number; y: number; width: number; height: number };
  const bottom = (b: Box) => b.y + b.height;
  const right = (b: Box) => b.x + b.width;
  // A margem do vidro (1 px) e os arredondamentos do layout: ±2 px.
  const near = (a: number, b: number) => Math.abs(a - b) <= 2;
  const overlaps = (a: Box, b: Box) =>
    a.x < right(b) && b.x < right(a) && a.y < bottom(b) && b.y < bottom(a);

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 360, height: 800 },
  ]) {
    test(`${viewport.width} px: chips em cima; botão de posição acima da faixa, sem a sobrepor nem à ficha`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const box = async (id: string) => (await page.getByTestId(id).boundingBox())!;
      await login(page, USERS.cliente);
      await openMap(page);

      // Sem a cápsula do título; o cabeçalho e a contagem ficam para os leitores de ecrã.
      await expect(page.getByTestId('map.title')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Mapa de empresas' })).toBeAttached();
      await expect(page.getByTestId('map.count')).toHaveText('5 empresas');
      await expect(page.getByTestId('map.count')).toHaveAttribute('aria-live', 'polite');
      const chips = await box('map.chips');
      const canvas = (await page.locator('.maplibregl-canvas').boundingBox())!;
      expect(chips.y - canvas.y).toBeLessThanOrEqual(16);

      // O botão de posição: dentro do ecrã, encostado à direita (12), 8 acima da faixa e sem a
      // sobrepor; a legenda à esquerda e a atribuição no canto, na mesma faixa.
      const check = async (state: string, band: string[]) => {
        const locate = await box('map.locate');
        expect(locate.x, state).toBeGreaterThanOrEqual(0);
        expect(locate.y, state).toBeGreaterThan(bottom(chips));
        expect(near(right(locate), viewport.width - 12), `${state}: ${right(locate)}`).toBe(true);
        expect(bottom(locate), state).toBeLessThanOrEqual(canvas.y + canvas.height);
        const below = await Promise.all(band.map(box));
        const top = Math.min(...below.map((b) => b.y));
        expect(top - bottom(locate), state).toBeGreaterThanOrEqual(8);
        expect(top - bottom(locate), state).toBeLessThan(10);
        for (const [i, b] of below.entries()) expect(overlaps(locate, b), band[i]).toBe(false);
        // A atribuição fica no canto inferior direito: é o elemento mais baixo da margem direita.
        const attribution = await box('map.attribution');
        const corner = await box(
          state === 'aberta' ? 'map.attribution.gisco' : 'map.attribution.info',
        );
        expect(near(right(corner), viewport.width - 12), `${state}: ${right(corner)}`).toBe(true);
        expect(near(bottom(corner), bottom(attribution)), state).toBe(true);
        return { locate, attribution };
      };

      // Atribuição aberta (OSM visível à entrada): legenda à esquerda, sem cortes nem sobreposições.
      await expect(page.getByTestId('map.attribution.osm')).toBeVisible();
      await check('aberta', ['map.attribution.osm', 'map.legend-box', 'map.attribution.gisco']);
      const legend = await box('map.legend-box');
      const gisco = await box('map.attribution.gisco');
      expect(near(legend.x, 12)).toBe(true);
      expect(overlaps(legend, gisco)).toBe(false);
      expect(overlaps(legend, await box('map.attribution.osm'))).toBe(false);
      expect(near(bottom(legend), bottom(gisco))).toBe(true);

      // Recolhida: o botão desce com a faixa.
      await page.getByTestId('map.attribution.close').click();
      await expect(page.getByTestId('map.attribution.info')).toBeVisible();
      await check('recolhida', ['map.legend-box', 'map.attribution.gisco', 'map.attribution.info']);
      expect(overlaps(await box('map.legend-box'), await box('map.attribution.info'))).toBe(false);

      // Ficha aberta: sem legenda; atribuição recolhida no canto, por cima da ficha; o botão por cima.
      await openMap(page, `/map?company=${C004}`);
      await expect(page.getByTestId('map.card')).toBeVisible();
      await expect(page.getByTestId('map.legend-box')).toHaveCount(0);
      const { attribution } = await check('ficha', ['map.attribution', 'map.sheet']);
      const sheet = await box('map.sheet');
      expect(sheet.y - bottom(attribution)).toBeGreaterThanOrEqual(8);
      expect(bottom(sheet)).toBeLessThanOrEqual(viewport.height);
      await context.close();
    });
  }

  test('teclado: chips → mapa → botão de posição → atribuição', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await login(page, USERS.cliente);
    await openMap(page);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const order: string[] = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      order.push(
        await page.evaluate(() => {
          const el = document.activeElement;
          if (el?.classList.contains('maplibregl-canvas')) return 'canvas';
          return el?.getAttribute('data-testid') ?? '';
        }),
      );
    }
    const at = (id: string) => order.indexOf(id);
    expect(at('companies.category-chip-all')).toBe(0);
    expect(at('canvas')).toBeGreaterThan(at('companies.category-chip-e2e-comercio'));
    expect(at('map.locate')).toBe(at('canvas') + 1);
    expect(at('map.attribution.close')).toBeGreaterThan(at('map.locate'));
    await context.close();
  });
});

// W5. Posição simulada com casas decimais distintivas (sem falsos positivos nas pesquisas).
const SIM = { latitude: 38.7123456, longitude: -9.4198765 };
const SIM_TRACES = ['38.7123', '9.41987', '38,7123', '9,41987'];

// Conta as chamadas à API de geolocalização do browser (regra 1: só depois do toque no botão).
async function instrumentGeolocation(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __geo: { get: number; watch: number };
      __geoInGesture: boolean[];
    };
    w.__geo = { get: 0, watch: 0 };
    // O Safari pode recusar sem perguntar se o pedido sai do gesto: regista se cada
    // getCurrentPosition correu com a ativação do utilizador ainda ativa.
    w.__geoInGesture = [];
    const geo = navigator.geolocation;
    if (!geo) return;
    const get = geo.getCurrentPosition.bind(geo);
    const watch = geo.watchPosition.bind(geo);
    geo.getCurrentPosition = (...args: Parameters<Geolocation['getCurrentPosition']>) => {
      w.__geo.get += 1;
      w.__geoInGesture.push(navigator.userActivation?.isActive ?? false);
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
    // Dentro do gesto do toque (sem await nem setTimeout antes do pedido).
    expect(
      await page.evaluate(
        () => (window as unknown as { __geoInGesture: boolean[] }).__geoInGesture,
      ),
    ).toEqual([true]);

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
    // Na web, a permissão é do browser (por site), não do dispositivo.
    await expect(page.getByTestId('map.locate.denied')).toHaveText(
      'Sem acesso à localização. Permita a localização para este site nas definições do browser.',
    );
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
    await expect(card).toContainText('Zona aproximada');
    await page.getByTestId('map.card.open').click();
    await expect(page).toHaveURL(new RegExp(`/companies/${C001}$`));
  });

  test('empresa com pino exato não mostra a nota de zona aproximada', async ({ page }) => {
    await login(page, USERS.cliente);
    await openMap(page, `/map?company=${C004}`);
    await expect(page.getByTestId('map.card')).toContainText('Livraria Atlântico');
    await expect(page.getByTestId('map.card')).not.toContainText('Zona aproximada');
  });

  test('?company= com um filtro ativo limpa o filtro e abre a ficha', async ({ page }) => {
    await login(page, USERS.cliente);
    await openMap(page);
    await page.getByTestId('companies.category-chip-e2e-servicos').click();
    await expect(page.getByTestId('map.count')).toHaveText('1 empresa');
    // Livraria Atlântico é de Comércio: o filtro de Serviços tem de sair.
    await page.goto(`/companies/${C004}`);
    await page.getByTestId('company-detail.address').click();
    await expect(page.getByTestId('map.card')).toContainText('Livraria Atlântico');
    // Desktop: a ficha substitui a lista no painel; "‹ Categorias" volta a ela, já sem filtro.
    await page.getByTestId('map.panel.back').click();
    await expect(page.getByTestId('map.count')).toHaveText('5 empresas');
    // (O ecrã das Empresas também fica montado e tem o seu chip "Todas".)
    await expect(
      page.getByTestId('map.panel').getByTestId('companies.category-chip-all'),
    ).toHaveAttribute('aria-checked', 'true');
  });

  test('?company= de uma empresa fora do mapa avisa (e não abre ficha)', async ({ page }) => {
    await login(page, USERS.cliente);
    await page.goto(`/map?company=${C006}`);
    await expect(page.getByTestId('map.company-missing')).toBeVisible();
    await expect(page.getByTestId('map.card')).toHaveCount(0);
  });

  test('cluster com folhas no mesmo ponto: tocar abre a lista do grupo (Review Focus 1)', async ({
    page,
  }) => {
    // c001, c002 e c003 (ENI sem opt-in) partilham o centróide CP4: o cluster nunca se desfaz.
    // `?company=` centra o mapa nesse ponto, no meio da área livre (fora do painel e dos controlos);
    // sem animação, o cluster (por baixo do pino selecionado) fica lá.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page, USERS.cliente);
    await openMap(page, `/map?company=${C001}`);
    await expect(page.getByTestId('map.card')).toBeVisible();
    const group = page.getByTestId('map.group');
    // Clique real no canvas (o MapLibre pode ainda estar a desenhar os tiles: tenta de novo).
    await expect(async () => {
      await page.mouse.click(...(await focusPoint(page)));
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
    // A rota passa por /map?company=<id> (o ecrã consome o parâmetro a seguir) e nada sai para a Google.
    const urls: string[] = [];
    page.on('framenavigated', (f) => {
      if (f === page.mainFrame()) urls.push(f.url());
    });
    const external: string[] = [];
    page.on('request', (r) => {
      if (/google\./.test(new URL(r.url()).hostname)) external.push(r.url());
    });
    await page.getByTestId('company-detail.address').click();
    await expect(page.getByTestId('map.card')).toContainText('Livraria Atlântico');
    expect(urls.some((u) => u.endsWith(`/map?company=${C004}`))).toBe(true);
    expect(external).toEqual([]);
  });
});
