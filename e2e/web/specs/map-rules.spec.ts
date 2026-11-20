import { expect, test, type Page } from '@playwright/test';
import { login, USERS } from '../helpers';

// Regras do refinamento do mapa (docs/design/mapa-refino.md, Fase B), que na Fase A só as capturas
// provavam: atribuição (OSMF §1.5.2) e "(i)", GISCO sempre à vista, ficha com localidade e sem
// coordenadas, teclado (Tab, Enter, Esc) e "só ficha, GISCO e (i)" com a ficha aberta.
// A regra "sem domínios externos" está em map.spec.ts (regra 3).

const C001 = 'e2e00000-0000-0000-0000-00000000c001'; // Pastelaria Conceição (ENI, zona)
const C004 = 'e2e00000-0000-0000-0000-00000000c004'; // Livraria Atlântico (coletiva, exata)
const GISCO_SHORT = 'Posições © EU GISCO';
const GISCO_FULL =
  '© European Union - GISCO, 2024, postal code point dataset, Licence CC-BY-SA 4.0.';
const MOBILE = { width: 390, height: 844 };

async function openMap(page: Page, path = '/map') {
  await page.goto(path);
  await expect(page.getByTestId('map.screen')).toBeVisible();
  await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 20_000 });
}

test.describe('mapa: atribuição (decisão 2)', () => {
  test('a OSM recolhe sozinha aos 5 s para o "(i)"; o GISCO curto fica; o "(i)" abre as fontes', async ({
    page,
  }) => {
    await login(page, USERS.cliente);
    await openMap(page);
    const started = Date.now();
    await expect(page.getByTestId('map.attribution.close')).toBeVisible();
    await expect(page.getByTestId('map.attribution.gisco')).toHaveText(GISCO_SHORT);

    // OSMF: "automatically after five seconds" (com 3 s de tolerância).
    await expect(page.getByTestId('map.attribution.info')).toBeVisible({ timeout: 8_000 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(4_000);
    await expect(page.getByTestId('map.attribution.close')).toHaveCount(0);
    await expect(page.getByTestId('map.attribution.gisco')).toBeVisible();
    // O texto oficial completo do GISCO só está no painel do "(i)".
    await expect(page.getByText(GISCO_FULL)).toHaveCount(0);

    await page.getByTestId('map.attribution.info').click();
    const details = page.getByTestId('map.attribution.details');
    await expect(details).toBeVisible();
    await expect(details).toContainText('colaboradores do OpenStreetMap');
    await expect(details).toContainText('ODbL');
    await expect(details).toContainText('Protomaps');
    await expect(page.getByTestId('map.attribution.gisco-full')).toContainText(GISCO_FULL);
    await expect(
      details.getByRole('link', { name: 'colaboradores do OpenStreetMap' }),
    ).toBeVisible();

    // Esc fecha o painel e volta o "(i)".
    await page.keyboard.press('Escape');
    await expect(details).toHaveCount(0);
    await expect(page.getByTestId('map.attribution.info')).toBeVisible();
  });

  test('o "x" e o primeiro gesto no mapa recolhem a OSM logo', async ({ page }) => {
    await login(page, USERS.cliente);
    await openMap(page);
    await page.getByTestId('map.attribution.close').click();
    await expect(page.getByTestId('map.attribution.info')).toBeVisible({ timeout: 1_000 });

    // Gesto: arrastar o mapa (dragstart com originalEvent), muito antes dos 5 s.
    await openMap(page);
    await expect(page.getByTestId('map.attribution.close')).toBeVisible();
    const canvas = (await page.locator('.maplibregl-canvas').boundingBox())!;
    const x = canvas.x + canvas.width * 0.7;
    const y = canvas.y + canvas.height * 0.5;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 80, y - 40, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByTestId('map.attribution.info')).toBeVisible({ timeout: 1_000 });
  });
});

test.describe('mapa: ficha', () => {
  test('com a ficha aberta (telemóvel) só ficam a ficha, o GISCO curto e o "(i)"', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: MOBILE });
    const page = await context.newPage();
    await login(page, USERS.cliente);
    await openMap(page);
    // Telemóvel (faixa de baixo, direção B): a legenda está no painel do "(i)", nunca na faixa.
    await expect(page.getByTestId('map.legend')).toHaveCount(0);
    await expect(page.getByTestId('map.attribution.close')).toBeVisible();

    await openMap(page, `/map?company=${C004}`);
    await expect(page.getByTestId('map.card')).toBeVisible();
    await expect(page.getByTestId('map.legend')).toHaveCount(0);
    await expect(page.getByTestId('map.attribution.close')).toHaveCount(0);
    await expect(page.getByTestId('map.attribution.info')).toBeVisible();
    await expect(page.getByTestId('map.attribution.gisco')).toBeVisible();

    // O "(i)" e o chip da OSM cabem nos 390 px (o chip da A3 ficava cortado à direita).
    for (const id of ['map.attribution.info', 'map.attribution.gisco', 'map.card']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.x, id).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, id).toBeLessThanOrEqual(MOBILE.width);
    }
    await context.close();
  });

  test('o chip da OSM não sai do ecrã a 390 px', async ({ browser }) => {
    const context = await browser.newContext({ viewport: MOBILE });
    const page = await context.newPage();
    await login(page, USERS.cliente);
    await openMap(page);
    const chip = (await page.getByTestId('map.attribution.close').boundingBox())!;
    expect(chip.x + chip.width).toBeLessThanOrEqual(MOBILE.width);
    await context.close();
  });

  test('ficha: nome, categoria e a localidade do detalhe; coordenadas só no /map', async ({
    page,
  }) => {
    await login(page, USERS.cliente);
    // Respostas da API que trazem coordenadas (chaves lat/lng em qualquer nível).
    const withCoords: string[] = [];
    page.on('response', async (r) => {
      const url = new URL(r.url());
      if (!url.pathname.startsWith('/api/') || !r.ok()) return;
      if (!(r.headers()['content-type'] ?? '').includes('json')) return;
      const text = await r.text().catch(() => '');
      if (/"(lat|lng|latitude|longitude)"\s*:/.test(text)) withCoords.push(url.pathname);
    });
    const detail = page.waitForResponse(
      (r) => new URL(r.url()).pathname === `/api/companies/${C001}`,
    );
    await openMap(page, `/map?company=${C001}`);
    const company = (await (await detail).json()) as { locality: string | null };

    const card = page.getByTestId('map.card');
    await expect(card).toContainText('Pastelaria Conceição');
    await expect(card).toContainText('Restauração');
    if (company.locality) {
      await expect(page.getByTestId('map.card.locality')).toHaveText(company.locality);
    }
    // Sem morada no card.
    await expect(card).not.toContainText('3000-000');
    await page.waitForLoadState('networkidle');
    expect([...new Set(withCoords)]).toEqual(['/api/companies/map']);
  });

  test('teclado: Tab chega às categorias, Enter filtra, Esc fecha a ficha', async ({ page }) => {
    await login(page, USERS.cliente);
    await openMap(page, `/map?company=${C004}`);
    await expect(page.getByTestId('map.card')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('map.card')).toHaveCount(0);

    // Desktop: a lista de categorias do painel é alcançável por Tab e ativa-se com Enter.
    const row = page.getByTestId('companies.category-chip-e2e-restauracao');
    const isFocused = () => row.evaluate((el) => el === document.activeElement);
    for (let i = 0; i < 40 && !(await isFocused()); i++) await page.keyboard.press('Tab');
    await expect(row).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('map.count')).toHaveText('2 empresas');
    await expect(row).toHaveAttribute('role', 'radio');
    await expect(row).toHaveAttribute('aria-checked', 'true');
    // O botão de posição e o "(i)" têm nome acessível e 44 px.
    await expect(page.getByTestId('map.attribution.info')).toBeVisible({ timeout: 8_000 });
    for (const id of ['map.locate', 'map.attribution.info']) {
      const el = page.getByTestId(id);
      await expect(el).toHaveAttribute('aria-label', /.+/);
      const b = (await el.boundingBox())!;
      expect(Math.min(b.width, b.height), id).toBeGreaterThanOrEqual(44);
    }
  });
});
