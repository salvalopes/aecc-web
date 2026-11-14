import { expect, test } from '@playwright/test';
import { USERS } from '../helpers';

test('pedido de recuperação de password mostra a mensagem de sucesso', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login.forgot-password').click();

  await page.getByTestId('forgot-password.email').fill(USERS.cliente);
  await page.getByTestId('forgot-password.submit').click();

  await expect(page.getByTestId('forgot-password.success')).toBeVisible();
});
