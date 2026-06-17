import { chromium, request, type FullConfig } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { AUTH_FILES, URLS } from './playwright.config';
import { ROLES, type RoleKey } from './fixtures/roles';
import { loginViaUI } from './helpers/auth';

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
      `Hint: ensure 'pnpm docker:dev:detach' is running and ports 3000/3001/3002/4000 are free.`
  );
}

async function probeApiLogin(roleKey: RoleKey): Promise<void> {
  // Hit the gateway's login endpoint directly first so a credential / gateway
  // failure surfaces as a sharp error before we spend time driving the UI.
  // The gateway returns `{ user, tokens: { accessToken, refreshToken } }`.
  const role = ROLES[roleKey];
  const ctx = await request.newContext({ baseURL: URLS.api });
  try {
    const response = await ctx.post('/api/v1/auth/login', {
      data: { email: role.email, password: role.password },
      timeout: 15_000,
    });
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `API probe login failed for ${roleKey} (${role.email}): ${response.status()} ${body.slice(0, 500)}`
      );
    }
  } finally {
    await ctx.dispose();
  }
}

async function loginAndPersist(roleKey: RoleKey): Promise<void> {
  // Drive a real UI login through the app's /login form, then snapshot the
  // resulting session (Bearer token pair + user in localStorage) to
  // storageState. Each project reuses its role's file so specs start
  // authenticated. This is only possible post-#1076 — the gateway↔SPA auth
  // contract (Bearer tokens, /me envelope, enum casing) had to be aligned
  // before the UI login path produced a usable session.
  const role = ROLES[roleKey];
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL: role.appUrl });
    const page = await context.newPage();
    await loginViaUI(page, role.email, role.password);
    const filePath = resolve(import.meta.dirname, AUTH_FILES[roleKey]);
    mkdirSync(dirname(filePath), { recursive: true });
    await context.storageState({ path: filePath });
    await context.close();
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const skipHealth = process.env.E2E_SKIP_HEALTH === '1';
  if (!skipHealth) {
    await Promise.all([
      // Gateway health path is `/health/simple` (services/gateway/src/server.ts).
      waitForUrl(`${URLS.api}/health/simple`, 'service.gateway'),
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
    await probeApiLogin(role);
    await loginAndPersist(role);
  }
}
