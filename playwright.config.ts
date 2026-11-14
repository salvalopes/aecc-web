import { defineConfig, devices } from '@playwright/test';

// E2E web (Fase 0B-2b). Os specs vivem em e2e/web/; este ficheiro fica na raiz para
// que `npx playwright test` funcione sem `-c`.
//
// Pré-requisitos: stack E2E do aecc-api em http://localhost:5080 (seed-e2e corrido) e
//   set -a; source ../aecc-api/.env.e2e; set +a      # define E2E_SEED_PASSWORD
//
// A app é servida a partir do build estático (expo export) com fallback SPA, na porta
// 8081 — a registada no OpenIddict (redirect_uri) e no CORS da stack E2E.

const API_URL = 'http://localhost:5080/api';
const ARTIFACTS = 'e2e/web/.artifacts';

export default defineConfig({
  testDir: 'e2e/web',
  outputDir: `${ARTIFACTS}/test-results`,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: `${ARTIFACTS}/report`, open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'off',
  },
  webServer: {
    command:
      `EXPO_PUBLIC_API_URL=${API_URL} npx expo export -p web --clear --output-dir e2e/web/.dist ` +
      '&& node e2e/web/serve-static.mjs e2e/web/.dist 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: false,
    timeout: 300_000,
  },
  projects: [
    {
      name: 'e2e',
      testDir: 'e2e/web/specs',
      use: { ...devices['Desktop Chrome'] },
    },
    // Screenshots "antes" do redesign — só com `npm run baseline:web` (BASELINE=1),
    // para que `npx playwright test` não as regenere.
    ...(process.env.BASELINE
      ? [{ name: 'baseline', testDir: 'e2e/web/baseline', use: { ...devices['Desktop Chrome'] } }]
      : []),
  ],
});
