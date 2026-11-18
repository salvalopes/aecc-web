import { expect, test } from '@playwright/test';
import { ASSOCIADO_COMPANY_ID, login, USERS } from '../helpers';

// Com o aecc-api#8, ownerUserId e a configuração dos pedidos de contacto só vêm para o
// dono e para o Admin. O detalhe decide "é dono" por ownerUserId: sem a chave, nem o
// "Editar" nem a secção de leads podem aparecer.
const DETAIL = `/companies/${ASSOCIADO_COMPANY_ID}`;

test('cliente abre o detalhe da empresa sem o editar nem os pedidos de contacto', async ({
  page,
}) => {
  await login(page, USERS.cliente);
  await page.goto(DETAIL);

  await expect(page.getByTestId('company-detail.title')).toContainText('Conceição');
  await expect(page.getByTestId('company-detail.edit')).toHaveCount(0);
  await expect(page.getByTestId('company-detail.leads')).toHaveCount(0);
  await expect(page.getByText('leads-c001@e2e.test')).toHaveCount(0);
});

test('dono abre o detalhe da própria empresa com o editar e os pedidos de contacto', async ({
  page,
}) => {
  await login(page, USERS.associado);
  await page.goto(DETAIL);

  await expect(page.getByTestId('company-detail.title')).toContainText('Conceição');
  await expect(page.getByTestId('company-detail.edit')).toBeVisible();
  await expect(page.getByTestId('company-detail.leads')).toBeVisible();
  await expect(page.getByTestId('company-detail.leads')).toContainText('leads-c001@e2e.test');
});
