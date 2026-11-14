import { expect, test } from '@playwright/test';
import { login, USERS } from '../helpers';

test('pesquisa sem acentos encontra a empresa e abre o detalhe', async ({ page }) => {
  await login(page, USERS.associado);

  await page.getByTestId('companies.search').fill('conceicao');
  const rows = page.getByTestId('directory.row');
  await expect(rows).toHaveCount(1);

  await rows.first().click();
  await expect(page.getByTestId('company-detail.title')).toContainText('Conceição');
});
