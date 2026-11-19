import { defineConfig, devices } from '@playwright/test';

// E2E web (Fase 0B-2b). Os specs vivem em e2e/web/; este ficheiro fica na raiz para
// que `npx playwright test` funcione sem `-c`.
//
// Pré-requisitos: stack E2E do aecc-api em http://localhost:5080 (seed-e2e corrido) e
//   set -a; source ../aecc-api/.env.e2e; set +a      # define E2E_SEED_PASSWORD
//
// A app é servida a partir do build estático (expo export) com fallback SPA, na porta
// 8081 — a registada no OpenIddict (redirect_uri) e no CORS da stack E2E.

// E2E_API_URL permite apontar a outra stack local (ex.: http://localhost:5081/api); o CI usa a 5080.
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:5080/api';
const TILES_URL = 'http://localhost:8081/tiles';
const ARTIFACTS = 'e2e/web/.artifacts';
// Capturas do refinamento do mapa (CAPTURE=1): uma cópia local dos tiles, glyphs e sprites do nosso
// servidor (scripts/map/capture/README.md), fora do repositório. Por omissão, a fixture vazia.
const TILES_DIR = process.env.E2E_TILES_DIR ?? 'e2e/web/fixtures/tiles';

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
  // Mapa: tiles, glyphs e sprites da fixture local (e2e/web/fixtures/tiles), na mesma origem que a
  // app, como o Caddy em produção. Os testes não dependem do servidor nem da T1.
  webServer: {
    command:
      `EXPO_PUBLIC_API_URL=${API_URL} EXPO_PUBLIC_TILES_URL=${TILES_URL} ` +
      'npx expo export -p web --clear --output-dir e2e/web/.dist ' +
      `&& node e2e/web/serve-static.mjs e2e/web/.dist 8081 ${TILES_DIR}`,
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
    // Capturas e métricas do refinamento do mapa (docs/design/mapa-refino.md): só com CAPTURE=1.
    ...(process.env.CAPTURE
      ? [{ name: 'capture', testDir: 'e2e/web/capture', use: { ...devices['Desktop Chrome'] } }]
      : []),
  ],
});
