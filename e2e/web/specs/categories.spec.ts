import { expect, test } from '@playwright/test';
import { login, USERS } from '../helpers';

// Contagens do seed-e2e: 6 empresas ativas em 4 categorias.
const EXPECTED: Record<string, number> = {
  'e2e-restauracao': 2,
  'e2e-comercio': 2,
  'e2e-servicos': 1,
  'e2e-industria': 1,
};

test('cada chip de categoria filtra a lista', async ({ page }) => {
  await login(page, USERS.associado);
  const rows = page.getByTestId('directory.row');
  await expect(rows).toHaveCount(6);

  for (const [slug, count] of Object.entries(EXPECTED)) {
    await page.getByTestId(`companies.category-chip-${slug}`).click();
    await expect(rows, `categoria ${slug}`).toHaveCount(count);
  }

  await page.getByTestId('companies.category-chip-all').click();
  await expect(rows).toHaveCount(6);
});

test('pesquisa sem resultados mostra o estado vazio', async ({ page }) => {
  await login(page, USERS.associado);

  await page.getByTestId('companies.search').fill('zzz-sem-resultados-e2e');

  await expect(page.getByTestId('directory.empty')).toBeVisible();
  await expect(page.getByTestId('directory.row')).toHaveCount(0);
});
