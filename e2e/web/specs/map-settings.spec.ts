import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { API_URL, apiAuthHeaders, login, USERS } from '../helpers';

// W6 / regra 8: os botões de mapa seguem as permissões da API (PUT /companies/{id}/map-settings).
//   - dono (associado, c001 ENI): "Mostrar pino exato" e "Esconder do mapa", no "Editar empresa";
//   - Admin: só "Esconder do mapa (Admin)", em /my-companies/<id>/map (ação "Mapa" no detalhe);
//   - cliente e associado não-dono: nenhum botão.
// Cada teste repõe as definições do seed pela API no fim (os outros specs contam 5 empresas).

const C001 = 'e2e00000-0000-0000-0000-00000000c001'; // do associado; ENI sem opt-in (zona)
const C004 = 'e2e00000-0000-0000-0000-00000000c004'; // coletiva, sem dono

async function resetMapSettings(request: APIRequestContext) {
  const owner = await apiAuthHeaders(request, USERS.associado);
  const admin = await apiAuthHeaders(request, USERS.admin);
  const put = (headers: Record<string, string>, id: string, data: object) =>
    request.put(`${API_URL}/companies/${id}/map-settings`, { headers, data });
  expect((await put(owner, C001, { showExactPin: false, hiddenFromMapByOwner: false })).ok()).toBe(
    true,
  );
  for (const id of [C001, C004]) {
    expect((await put(admin, id, { hiddenFromMapByAdmin: false })).ok()).toBe(true);
  }
}

test.afterEach(async ({ request }) => {
  await resetMapSettings(request);
});

const OWNER_BUTTONS = ['company-edit.map-exact', 'company-edit.map-hidden'];
const ADMIN_BUTTONS = ['company-map.admin-hidden'];
const ALL_BUTTONS = [...OWNER_BUTTONS, ...ADMIN_BUTTONS];

async function expectNoMapButtons(page: Page) {
  for (const id of ALL_BUTTONS) await expect(page.getByTestId(id)).toHaveCount(0);
}

/** Toca no interruptor e espera pela resposta do PUT (o interruptor muda logo, de forma otimista). */
async function toggle(page: Page, testID: string) {
  const sw = page.getByTestId(testID).getByRole('switch');
  const saved = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && r.url().endsWith('/map-settings') && r.ok(),
  );
  await sw.click();
  await saved;
  return sw;
}

async function mapCount(page: Page, expected: string) {
  await page.goto('/map');
  await expect(page.getByTestId('map.count')).toHaveText(expected);
}

test.describe('regra 8: botões de mapa por perfil', () => {
  test('cliente: nenhum botão (detalhe, edição e ecrã do mapa da empresa)', async ({ page }) => {
    await login(page, USERS.cliente);
    await page.goto(`/companies/${C004}`);
    await expect(page.getByTestId('company-detail.screen')).toBeVisible();
    await expect(page.getByTestId('company-detail.map-settings')).toHaveCount(0);

    await page.goto(`/my-companies/${C001}/map`);
    await expect(page.getByTestId('state.forbidden')).toBeVisible();
    await expectNoMapButtons(page);

    await page.goto(`/my-companies/${C001}/edit`);
    await expect(page.getByTestId('state.forbidden')).toBeVisible();
    await expectNoMapButtons(page);
  });

  test('associado não-dono: nenhum botão na empresa de outro', async ({ page }) => {
    await login(page, USERS.associado);
    await page.goto(`/companies/${C004}`);
    await expect(page.getByTestId('company-detail.screen')).toBeVisible();
    await expect(page.getByTestId('company-detail.map-settings')).toHaveCount(0);

    await page.goto(`/my-companies/${C004}/map`);
    await expect(page.getByTestId('state.forbidden')).toBeVisible();
    await expectNoMapButtons(page);
  });

  test('dono (ENI): vê "Mostrar pino exato" e "Esconder do mapa", não o do Admin', async ({
    page,
  }) => {
    await login(page, USERS.associado);
    await page.goto(`/my-companies/${C001}/edit`);
    await expect(page.getByTestId('map-settings')).toBeVisible();
    for (const id of OWNER_BUTTONS) await expect(page.getByTestId(id)).toBeVisible();
    await expect(page.getByTestId('company-map.admin-hidden')).toHaveCount(0);
  });

  test('Admin: só "Esconder do mapa (Admin)" (nunca o pino exato do dono)', async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto(`/companies/${C001}`);
    await page.getByTestId('company-detail.map-settings').click();
    await expect(page).toHaveURL(new RegExp(`/my-companies/${C001}/map$`));
    await expect(page.getByTestId('company-map.admin-hidden')).toBeVisible();
    for (const id of OWNER_BUTTONS) await expect(page.getByTestId(id)).toHaveCount(0);
  });
});

test.describe('W6: efeito dos botões no mapa', () => {
  test('dono esconde a empresa do mapa e a contagem baixa 1', async ({ page }) => {
    await login(page, USERS.associado);
    await mapCount(page, '5 empresas');
    await page.goto(`/my-companies/${C001}/edit`);
    await expect(page.getByTestId('company-edit.map-hidden').getByRole('switch')).not.toBeChecked();
    const hidden = await toggle(page, 'company-edit.map-hidden');
    await expect(hidden).toBeChecked();
    await expect(page.getByTestId('map-settings')).toContainText('A empresa não aparece no mapa.');
    await mapCount(page, '4 empresas');
    await expect(page.getByTestId(`map.pin.${C001}`)).toHaveCount(0);
  });

  test('dono liga o pino exato: a empresa deixa de estar em zona aproximada', async ({ page }) => {
    await login(page, USERS.associado);
    await page.goto('/map');
    await expect(page.getByTestId(`map.pin.${C001}`)).toHaveAttribute(
      'aria-label',
      /zona aproximada/,
    );
    await page.goto(`/my-companies/${C001}/edit`);
    const exact = await toggle(page, 'company-edit.map-exact');
    await expect(exact).toBeChecked();
    await page.goto('/map');
    await expect(page.getByTestId(`map.pin.${C001}`)).toHaveAttribute(
      'aria-label',
      'Pastelaria Conceição',
    );
  });

  test('Admin esconde do mapa e a contagem baixa 1', async ({ page }) => {
    await login(page, USERS.admin);
    await page.goto(`/my-companies/${C004}/map`);
    const adminHidden = await toggle(page, 'company-map.admin-hidden');
    await expect(adminHidden).toBeChecked();
    await mapCount(page, '4 empresas');
    await expect(page.getByTestId(`map.pin.${C004}`)).toHaveCount(0);
  });

  test('escondida pelo Admin: o dono vê a nota e não a consegue repor', async ({
    page,
    request,
  }) => {
    const admin = await apiAuthHeaders(request, USERS.admin);
    const res = await request.put(`${API_URL}/companies/${C001}/map-settings`, {
      headers: admin,
      data: { hiddenFromMapByAdmin: true },
    });
    expect(res.ok()).toBe(true);

    await login(page, USERS.associado);
    await page.goto(`/my-companies/${C001}/edit`);
    await expect(page.getByTestId('map-settings')).toContainText(
      'Escondida do mapa pela administração.',
    );
    // O botão do dono continua a existir, mas desligar o "Esconder do mapa" dele não a repõe.
    await expect(page.getByTestId('company-edit.map-hidden').getByRole('switch')).not.toBeChecked();
    await expect(page.getByTestId('company-map.admin-hidden')).toHaveCount(0);
    await mapCount(page, '4 empresas');
  });
});
