import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { API_URL, ASSOCIADO_COMPANY_ID, login, USERS } from '../helpers';

const LOGO = path.join(__dirname, '..', 'fixtures', 'logo.png');

async function openEditModal(page: Page) {
  await page.goto('/my-companies');
  await page.getByTestId('my-companies.edit').click();
  await expect(page.getByTestId('company-edit.description')).toBeVisible();
}

async function saveAndWaitClose(page: Page) {
  await page.getByTestId('company-edit.save').click();
  await expect(page.getByTestId('company-edit.description')).toHaveCount(0, { timeout: 15_000 });
}

// Repetível sem reseed: escreve uma descrição única, confirma que persistiu e repõe
// sempre a original no fim (mesmo que o teste falhe a meio).
test('associado edita a descrição da própria empresa e ela persiste', async ({ page }) => {
  await login(page, USERS.associado);
  await openEditModal(page);

  const description = page.getByTestId('company-edit.description');
  const original = await description.inputValue();
  const unique = `Descrição E2E ${Date.now()}`;

  try {
    await description.fill(unique);
    await saveAndWaitClose(page);

    await page.reload();
    await openEditModal(page);
    await expect(page.getByTestId('company-edit.description')).toHaveValue(unique);
  } finally {
    await openEditModal(page);
    await page.getByTestId('company-edit.description').fill(original);
    await saveAndWaitClose(page);
  }
});

// Repetível: cada execução faz um upload novo (nome de ficheiro gerado pela API).
test('associado faz upload do logo e passa a ser servido pelo storage local E2E', async ({
  page,
  request,
}) => {
  await login(page, USERS.associado);
  await openEditModal(page);

  // O expo-image-picker na web abre um <input type="file"> — apanhado pelo filechooser.
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('company-edit.logo-upload').click();
  const chooser = await chooserPromise;
  await chooser.setFiles(LOGO);

  await saveAndWaitClose(page);

  const response = await request.get(`${API_URL}/companies/${ASSOCIADO_COMPANY_ID}`);
  expect(response.ok()).toBeTruthy();
  const { logoUrl } = (await response.json()) as { logoUrl: string | null };
  expect(logoUrl).toContain('/e2e-files/');

  const file = await request.get(logoUrl!);
  expect(file.status()).toBe(200);
  expect(file.headers()['content-type']).toContain('image/');
});
