import { expect, test } from '@playwright/test';
import { login, USERS } from '../helpers';

// T2 (B9): uma rota protegida aberta sem o papel certo mostra "sem permissão"
// no sítio, em vez do redirect silencioso do antigo RoleGuard.
test('associado em /users vê "sem permissão" e volta ao início', async ({ page }) => {
  await login(page, USERS.associado);

  await page.goto('/users');

  await expect(page.getByTestId('state.forbidden')).toBeVisible();
  await expect(page).toHaveURL(/\/users$/);

  await page.getByTestId('state.forbidden.action').click();
  await expect(page.getByTestId('home.screen')).toBeVisible();
});
