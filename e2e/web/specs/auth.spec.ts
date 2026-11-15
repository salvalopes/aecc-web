import { expect, test } from '@playwright/test';
import { login, seedPassword, USERS } from '../helpers';

test('login do associado abre o diretório e o logout volta ao login', async ({ page }) => {
  await login(page, USERS.associado);

  await page.getByTestId('tab.profile').click();
  await page.getByTestId('profile.logout').click();

  await expect(page.getByTestId('login.screen')).toBeVisible();
  await expect(page.getByTestId('tab.profile')).toHaveCount(0);
});

test('login com credenciais inválidas mostra o erro do formulário', async ({ page }) => {
  await page.goto('/login');
  // Email inexistente: nunca incrementa o contador de falhas (lockout) de nenhuma conta.
  await page.getByTestId('login.email').fill('nao-existe@e2e.test');
  await page.getByTestId('login.password').fill(seedPassword());
  await page.getByTestId('login.submit').click();

  await expect(page.getByTestId('login.form-error')).toBeVisible();
  await expect(page.getByTestId('login.screen')).toBeVisible();
});
