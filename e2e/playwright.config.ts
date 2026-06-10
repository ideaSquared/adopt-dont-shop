import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

export const URLS = {
  // Phase 11 follow-up: the monolith on :5000 is gone. The Fastify gateway
  // (services/gateway) is the single REST/WS edge and listens on :4000 in
  // docker-compose. Override with E2E_API_URL if a future deploy puts nginx
  // (`http://api.localhost`) or another reverse proxy in front.
  api: process.env.E2E_API_URL ?? 'http://localhost:4000',
  client: process.env.E2E_CLIENT_URL ?? 'http://localhost:3000',
  admin: process.env.E2E_ADMIN_URL ?? 'http://localhost:3001',
  rescue: process.env.E2E_RESCUE_URL ?? 'http://localhost:3002',
} as const;

export const AUTH_FILES = {
  adopter: '.auth/adopter.json',
  rescue: '.auth/rescue.json',
  admin: '.auth/admin.json',
} as const;

// Phase 11 follow-up: the legacy app.client / app.rescue / app.admin
// projects below are temporarily parked — every spec under their testDirs
// is matched by `testIgnore: PARKED_TESTS` so none execute. The projects
// remain in the config (rather than being deleted) so storageState wiring
// and project naming stay stable while the rework lands.
//
// Why each project is parked rather than removed:
//   1. The monolith's CSRF + httpOnly-cookie contract is gone; lib.auth
//      and the per-app login flows still need to be reworked against the
//      gateway's `{ tokens: { accessToken } }` Bearer-token shape before
//      UI specs can drive a real session (see services/gateway/src/
//      routes/auth.ts and lib.auth/src/services/auth-service.ts).
//   2. The seeded API surface only exists for the four cutover domains
//      below (auth, pets, rescue, applications). The remaining specs hit
//      routes whose service hasn't shipped a full SPA-compatible shape
//      yet (chat / moderation / cms / matching / notifications detail).
//
// The smoke project below DOES run and gates CI on the gateway's auth +
// seeded-credentials contract, which is the smallest meaningful signal we
// can give engineers today without lying about coverage.
const PARKED_TESTS = [/.*/];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: CI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    extraHTTPHeaders: {
      'x-e2e-run': process.env.E2E_RUN_ID ?? 'local',
    },
  },
  projects: [
    {
      // Direct gateway probe — proves the API edge is reachable, the
      // seeded personas resolve, and the auth login contract returns the
      // documented shape. This is the only meaningful signal until the
      // UI / API surface is reworked against the gateway's new contract.
      name: 'gateway-smoke',
      testDir: './tests/gateway-smoke',
      use: { baseURL: URLS.api },
    },
    // The four projects below are stubs to keep storageState / project
    // shape stable while the legacy app-driven specs are parked. They
    // ignore everything under their testDir so no legacy spec runs.
    {
      name: 'client',
      testDir: './tests/client',
      testIgnore: PARKED_TESTS,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: URLS.client,
        storageState: AUTH_FILES.adopter,
      },
    },
    {
      name: 'rescue',
      testDir: './tests/rescue',
      testIgnore: PARKED_TESTS,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: URLS.rescue,
        storageState: AUTH_FILES.rescue,
      },
    },
    {
      name: 'admin',
      testDir: './tests/admin',
      testIgnore: PARKED_TESTS,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: URLS.admin,
        storageState: AUTH_FILES.admin,
      },
    },
  ],
});
