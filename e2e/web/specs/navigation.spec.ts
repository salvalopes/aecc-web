import { expect, test, type Page } from '@playwright/test';
import { login, USERS } from '../helpers';

// W1 (mapa-plano §7): tabs por papel. Máximo de 5 tabs (limite do Android).
//   Admin:     Início, Empresas, Mapa, Editar, Gestão
//   Associado: Início, Empresas, Mapa, Editar, Perfil
//   Cliente:   Início, Empresas, Mapa, Perfil
// A gestão de utilizadores sai das tabs e passa para dentro de Gestão (só Admin).

const ALL = ['tab.home', 'tab.companies', 'tab.map', 'tab.my-companies', 'tab.profile'];

async function expectTabs(page: Page, visible: string[]) {
  for (const id of visible) await expect(page.getByTestId(id)).toBeVisible();
  for (const id of ALL.filter((t) => !visible.includes(t))) {
    await expect(page.getByTestId(id)).toHaveCount(0);
  }
  await expect(page.getByTestId('tab.users')).toHaveCount(0);
}

test('admin vê Início, Empresas, Mapa, Editar e Gestão (sem Utilizadores)', async ({ page }) => {
  await login(page, USERS.admin);
  await expectTabs(page, ALL);
  await expect(page.getByTestId('tab.profile')).toContainText('Gestão');
});

test('associado vê Início, Empresas, Mapa, Editar e Perfil', async ({ page }) => {
  await login(page, USERS.associado);
  await expectTabs(page, ALL);
  await expect(page.getByTestId('tab.profile')).toContainText('Perfil');
});

test('cliente vê Início, Empresas, Mapa e Perfil', async ({ page }) => {
  await login(page, USERS.cliente);
  await expectTabs(page, ['tab.home', 'tab.companies', 'tab.map', 'tab.profile']);
});

test('tab Mapa abre o ecrã do mapa', async ({ page }) => {
  await login(page, USERS.cliente);
  await page.getByTestId('tab.map').click();
  await expect(page.getByTestId('map.screen')).toBeVisible();
  await expect(page).toHaveURL(/\/map$/);
});

test('admin chega aos utilizadores pela Gestão', async ({ page }) => {
  await login(page, USERS.admin);
  await page.getByTestId('tab.profile').click();
  await page.getByTestId('profile.users').click();
  await expect(page.getByTestId('users.screen')).toBeVisible();
  await expect(page).toHaveURL(/\/users$/);
});

test('associado não vê a entrada de utilizadores no Perfil', async ({ page }) => {
  await login(page, USERS.associado);
  await page.getByTestId('tab.profile').click();
  await expect(page.getByTestId('profile.screen')).toBeVisible();
  await expect(page.getByTestId('profile.users')).toHaveCount(0);
});

test('admin em /users/new vê o formulário', async ({ page }) => {
  await login(page, USERS.admin);
  await page.goto('/users/new');
  await expect(page.getByTestId('user-create.email')).toBeVisible();
});
