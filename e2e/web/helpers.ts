import { expect, type APIRequestContext, type Page } from '@playwright/test';

// Dados do seed sintético do aecc-api (seed-e2e). Nenhum dado real.
export const API_URL = 'http://localhost:5080/api';
export const USERS = {
  admin: 'admin@e2e.test',
  associado: 'associado@e2e.test',
  cliente: 'cliente@e2e.test',
} as const;
export const ASSOCIADO_COMPANY_ID = 'e2e00000-0000-0000-0000-00000000c001';
export const ASSOCIADO_PRODUCT_ID = 'e2e00000-0000-0000-0000-00000000d001';

// A password vem só do ambiente (set -a; source ../aecc-api/.env.e2e; set +a).
export function seedPassword(): string {
  const value = process.env.E2E_SEED_PASSWORD;
  if (!value) throw new Error('E2E_SEED_PASSWORD não está definida (source ../aecc-api/.env.e2e).');
  return value;
}

// Cabeçalho Bearer para verificações diretas à API (as leituras de empresas exigem sessão).
// Usa o grant password do cliente aecc-native — o rate limiting está desligado na stack E2E.
export async function apiAuthHeaders(
  request: APIRequestContext,
  email: string,
): Promise<Record<string, string>> {
  const response = await request.post(`${API_URL}/connect/token`, {
    form: {
      grant_type: 'password',
      client_id: 'aecc-native',
      username: email,
      password: seedPassword(),
      scope: 'openid profile email offline_access roles aecc_api',
    },
  });
  expect(response.ok()).toBeTruthy();
  const { access_token } = (await response.json()) as { access_token: string };
  return { Authorization: `Bearer ${access_token}` };
}

// Login pela UI: POST /auth/login → /api/connect/authorize → /auth/callback → /companies.
export async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login.email').fill(email);
  await page.getByTestId('login.password').fill(seedPassword());
  await page.getByTestId('login.submit').click();
  await expect(page.getByTestId('companies.screen')).toBeVisible({ timeout: 30_000 });
}
