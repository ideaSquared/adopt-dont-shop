import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

export const URLS = {
  api: process.env.E2E_API_URL ?? 'http://localhost:5000',
  client: process.env.E2E_CLIENT_URL ?? 'http://localhost:3000',
  admin: process.env.E2E_ADMIN_URL ?? 'http://localhost:3001',
  rescue: process.env.E2E_RESCUE_URL ?? 'http://localhost:3002',
} as const;

export const AUTH_FILES = {
  adopter: '.auth/adopter.json',
  rescue: '.auth/rescue.json',
  admin: '.auth/admin.json',
} as const;

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
      name: 'client',
      testDir: './tests/client',
      testIgnore: [/registration-and-login\.spec\.ts/, /password-reset-flow\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: URLS.client,
        storageState: AUTH_FILES.adopter,
      },
    },
    {
      name: 'rescue',
      testDir: './tests/rescue',
      testIgnore: [
        /staff-invitation-acceptance\.spec\.ts/,
        /invitation-expiry-and-resend\.spec\.ts/,
      ],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: URLS.rescue,
        storageState: AUTH_FILES.rescue,
      },
    },
    {
      name: 'admin',
      testDir: './tests/admin',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: URLS.admin,
        storageState: AUTH_FILES.admin,
      },
    },
    {
      name: 'client-anon',
      testDir: './tests/client',
      testMatch: [/registration-and-login\.spec\.ts/, /password-reset-flow\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: URLS.client,
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: 'rescue-anon',
      testDir: './tests/rescue',
      testMatch: [
        /staff-invitation-acceptance\.spec\.ts/,
        /invitation-expiry-and-resend\.spec\.ts/,
      ],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: URLS.rescue,
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
});
