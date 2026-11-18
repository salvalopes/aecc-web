import { expect, test } from '@playwright/test';
import { login, USERS } from '../helpers';

// W7: Gestão → "Empresas sem localização" (só Admin), com o motivo do GET /companies/unlocated
// (aecc-api docs/mapa.md @ 4d4fd15): "no-location" | "insufficient-area" (não existe
// "outside-bounds"). PUT /companies/{id}/location só para "no-location".
// O seed E2E não tem empresas sem localização: a lista com motivos usa uma resposta simulada do
// GET com ids reais do seed; o PUT vai à API real (204).

const C002 = 'e2e00000-0000-0000-0000-00000000c002'; // Restaurante Horizonte
const C003 = 'e2e00000-0000-0000-0000-00000000c003'; // Óptica São João

const UNLOCATED = [
  { id: C003, name: 'Óptica São João', reason: 'insufficient-area' },
  { id: C002, name: 'Restaurante Horizonte', reason: 'no-location' },
];

test('Admin vê "Empresas sem localização" na Gestão; o seed não tem nenhuma', async ({ page }) => {
  await login(page, USERS.admin);
  await page.getByTestId('tab.profile').click();
  const row = page.getByTestId('profile.unlocated');
  await expect(row).toContainText('Empresas sem localização (0)');
  await row.click();
  await expect(page).toHaveURL(/\/companies-unlocated$/);
  await expect(page.getByTestId('unlocated.empty')).toBeVisible();
});

test('associado e cliente não veem a entrada nem a lista', async ({ page }) => {
  await login(page, USERS.associado);
  await page.getByTestId('tab.profile').click();
  await expect(page.getByTestId('profile.screen')).toBeVisible();
  await expect(page.getByTestId('profile.unlocated')).toHaveCount(0);
  await page.goto('/companies-unlocated');
  await expect(page.getByTestId('state.forbidden')).toBeVisible();
  await expect(page.getByTestId('unlocated.screen')).toHaveCount(0);
});

test('lista com o motivo; "Definir posição" só para "no-location", validada pela caixa do mapa', async ({
  page,
}) => {
  let list = UNLOCATED;
  await page.route('**/api/companies/unlocated', (route) =>
    // O cliente usa credentials: 'include' → CORS com a origem exata e Allow-Credentials.
    route.fulfill({
      json: list,
      headers: {
        'access-control-allow-origin': 'http://localhost:8081',
        'access-control-allow-credentials': 'true',
      },
    }),
  );
  await login(page, USERS.admin);
  await page.goto('/companies-unlocated');

  await expect(page.getByTestId(`unlocated.reason.${C002}`)).toContainText('Sem localização');
  await expect(page.getByTestId(`unlocated.reason.${C003}`)).toContainText(
    'Zona do código postal insuficiente',
  );
  // "insufficient-area" não se resolve com coordenadas: sem botão.
  await expect(page.getByTestId(`unlocated.set-location.${C003}`)).toHaveCount(0);

  await page.getByTestId(`unlocated.set-location.${C002}`).click();
  const puts: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'PUT' && r.url().endsWith('/location')) puts.push(r.postData() ?? '');
  });

  // Fora da caixa do mapa (lat 38.62–38.86, lng −9.52 a −9.10): erro no cliente, sem pedido.
  await page.getByTestId('unlocated.lat').fill('40.2');
  await page.getByTestId('unlocated.lng').fill('-8.4');
  await page.getByTestId('unlocated.save').click();
  await expect(page.getByTestId('unlocated.lat-error')).toBeVisible();
  expect(puts).toEqual([]);

  // Dentro da caixa (vírgula decimal aceite): PUT real → 204, e a empresa sai da lista.
  await page.getByTestId('unlocated.lat').fill('38,7');
  await page.getByTestId('unlocated.lng').fill('-9.42');
  list = UNLOCATED.filter((c) => c.id !== C002);
  const saved = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && r.url().endsWith(`/companies/${C002}/location`),
  );
  await page.getByTestId('unlocated.save').click();
  expect((await saved).status()).toBe(204);
  expect(JSON.parse(puts[0])).toEqual({ lat: 38.7, lng: -9.42 });
  await expect(page.getByTestId(`unlocated.row.${C002}`)).toHaveCount(0);
  await expect(page.getByTestId(`unlocated.row.${C003}`)).toBeVisible();
});
