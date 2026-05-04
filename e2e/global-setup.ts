import { chromium, request, type FullConfig } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { AUTH_FILES, URLS } from './playwright.config';
import { ROLES, type RoleKey } from './fixtures/roles';

const HEALTH_BUDGET_MS = 90_000;
const HEALTH_INTERVAL_MS = 1_500;

async function waitForUrl(url: string, label: string): Promise<void> {
  const ctx = await request.newContext({ ignoreHTTPSErrors: true });
  const deadline = Date.now() + HEALTH_BUDGET_MS;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const response = await ctx.get(url, { timeout: 5_000 });
      if (response.status() >= 200 && response.status() < 500) {
        await ctx.dispose();
        return;
      }
      lastError = new Error(`status ${response.status()}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(r => setTimeout(r, HEALTH_INTERVAL_MS));
  }
  await ctx.dispose();
  throw new Error(
    `Timed out after ${HEALTH_BUDGET_MS}ms waiting for ${label} (${url}). ` +
      `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}. ` +
      `Hint: ensure 'npm run docker:dev:detach' is running and ports 3000/3001/3002/5000 are free.`
  );
}

async function loginAndPersist(roleKey: RoleKey): Promise<void> {
  const role = ROLES[roleKey];
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL: role.appUrl });
    const page = await context.newPage();
    await page.goto('/login');

    const emailField = page.getByLabel(/email/i).first();
    const passwordField = page.getByLabel(/password/i).first();
    await emailField.fill(role.email);
    await passwordField.fill(role.password);

    const submit = page.getByRole('button', { name: /^(sign in|log ?in)$/i }).first();
    await Promise.all([
      page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20_000 }),
      submit.click(),
    ]);

    const filePath = resolve(import.meta.dirname, AUTH_FILES[roleKey]);
    mkdirSync(dirname(filePath), { recursive: true });
    await context.storageState({ path: filePath });
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const skipHealth = process.env.E2E_SKIP_HEALTH === '1';
  if (!skipHealth) {
    await Promise.all([
      waitForUrl(`${URLS.api}/health`, 'service.backend'),
      waitForUrl(URLS.client, 'app.client'),
      waitForUrl(URLS.admin, 'app.admin'),
      waitForUrl(URLS.rescue, 'app.rescue'),
    ]);
  }

  if (process.env.E2E_SKIP_AUTH === '1') {
    return;
  }

  const roles: RoleKey[] = ['adopter', 'rescue', 'admin'];
  for (const role of roles) {
    await loginAndPersist(role);
  }
}
