import fs from 'node:fs';
import path from 'node:path';
import { test, type Browser } from '@playwright/test';
import { ASSOCIADO_COMPANY_ID, ASSOCIADO_PRODUCT_ID, login, USERS } from '../helpers';

// Screenshots "antes" do redesign (docs/redesign/00-inventario.md §1.3).
// Só corre com `npm run baseline:web`. Nome: <rota>__<largura>__<tema>.png
// Fora: /companies/category/:id — é só um <Redirect> para /companies, sem UI própria.

// BASELINE_OUT (opcional, relativo à raiz do repo) desvia o output — ex. comparar após upgrades
// sem sobrescrever o baseline versionado.
const OUT = process.env.BASELINE_OUT
  ? path.resolve(process.env.BASELINE_OUT)
  : path.join(__dirname, '..', '..', '..', 'docs', 'redesign', 'baseline', 'web');
const AUTH_DIR = path.join(__dirname, '..', '.auth'); // ignorada pelo git (contém tokens)

type Role = 'public' | 'associado' | 'admin';
const SCREENS: { name: string; url: string; role: Role }[] = [
  { name: 'login', url: '/login', role: 'public' },
  { name: 'register', url: '/register', role: 'public' },
  { name: 'forgot-password', url: '/forgot-password', role: 'public' },
  { name: 'confirm-email', url: '/confirm-email', role: 'public' }, // sem parâmetros → "link inválido"
  { name: 'reset-password', url: '/reset-password', role: 'public' }, // sem parâmetros → "link inválido"
  { name: 'auth-callback', url: '/auth/callback', role: 'public' }, // sem code/state → erro
  { name: 'not-found', url: '/rota-que-nao-existe', role: 'public' },
  { name: 'index', url: '/', role: 'associado' },
  { name: 'companies', url: '/companies', role: 'associado' },
  { name: 'companies-id', url: `/companies/${ASSOCIADO_COMPANY_ID}`, role: 'associado' },
  { name: 'products-id', url: `/products/${ASSOCIADO_PRODUCT_ID}`, role: 'associado' },
  { name: 'favourites', url: '/favourites', role: 'associado' },
  { name: 'profile', url: '/profile', role: 'associado' },
  { name: 'my-companies', url: '/my-companies', role: 'associado' },
  { name: 'users', url: '/users', role: 'admin' },
];
const WIDTHS = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
];
const THEMES = ['light', 'dark'] as const;

async function saveSession(browser: Browser, role: Exclude<Role, 'public'>): Promise<string> {
  const file = path.join(AUTH_DIR, `${role}.json`);
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, USERS[role]);
  await context.storageState({ path: file });
  await context.close();
  return file;
}

test.describe.configure({ mode: 'serial' });

test('baseline web: todos os ecrãs × 2 larguras × 2 temas', async ({ browser }) => {
  test.setTimeout(600_000);
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const sessions: Record<Role, string | undefined> = {
    public: undefined,
    associado: await saveSession(browser, 'associado'),
    admin: await saveSession(browser, 'admin'),
  };

  for (const screen of SCREENS) {
    for (const viewport of WIDTHS) {
      for (const colorScheme of THEMES) {
        const context = await browser.newContext({
          viewport,
          colorScheme,
          storageState: sessions[screen.role],
        });
        const page = await context.newPage();
        await page.goto(screen.url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800); // fontes, imagens e transições de entrada
        await page.screenshot({
          path: path.join(OUT, `${screen.name}__${viewport.width}__${colorScheme}.png`),
          fullPage: true,
        });
        await context.close();
      }
    }
  }
});
