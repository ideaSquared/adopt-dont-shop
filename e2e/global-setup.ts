import { request, type FullConfig } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
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
      `Hint: ensure 'npm run docker:dev:detach' is running and ports 3000/3001/3002/4000 are free.`
  );
}

async function probeApiLogin(roleKey: RoleKey): Promise<void> {
  // Hit the gateway's login endpoint directly so we can isolate "is the
  // gateway + service.auth usable?" from any frontend-specific failure.
  // Phase 11 follow-up: the gateway does NOT issue/require a CSRF token —
  // it returns `{ user, tokens: { accessToken, refreshToken } }` in the
  // JSON body. Bearer auth replaces the monolith's httpOnly-cookie model.
  const role = ROLES[roleKey];
  const ctx = await request.newContext({ baseURL: URLS.api });
  try {
    const response = await ctx.post('/api/v1/auth/login', {
      data: { email: role.email, password: role.password },
      timeout: 15_000,
    });
    const body = await response.text();
    if (!response.ok()) {
      throw new Error(
        `API probe login failed for ${roleKey} (${role.email}): ${response.status()} ${body.slice(0, 500)}`
      );
    }
  } finally {
    await ctx.dispose();
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const skipHealth = process.env.E2E_SKIP_HEALTH === '1';
  if (!skipHealth) {
    await Promise.all([
      // Phase 11 follow-up: gateway health path is `/health/simple`
      // (matches service.backend's old path; see services/gateway/src/
      // server.ts). `/health` was the monolith's catch-all and no longer
      // exists on the gateway.
      waitForUrl(`${URLS.api}/health/simple`, 'service.gateway'),
      waitForUrl(URLS.client, 'app.client'),
      waitForUrl(URLS.admin, 'app.admin'),
      waitForUrl(URLS.rescue, 'app.rescue'),
    ]);
  }

  if (process.env.E2E_SKIP_AUTH === '1') {
    return;
  }

  // Phase 11 follow-up: API-only auth probe per role. The UI-driven
  // `loginAndPersist` previously seeded storageState by walking through
  // the React form, but lib.auth's auth-service still expects the deleted
  // monolith's cookie + CSRF contract (the gateway returns a Bearer token
  // in the JSON body instead). Until lib.auth is reworked against the
  // gateway, the UI login path is broken and the e2e suite must skip the
  // specs that depend on storageState. Probing the API here keeps a sharp
  // failure signal if the gateway / seeded credentials regress.
  const roles: RoleKey[] = ['adopter', 'rescue', 'admin'];
  for (const role of roles) {
    await probeApiLogin(role);
  }

  // Playwright projects in playwright.config.ts reference `storageState:
  // AUTH_FILES[role]`. The file must exist on disk even if the suite skips
  // every spec that relies on it — Playwright reads it during project
  // bootstrap, before any test.skip() runs. Write empty storageState so
  // the auth-gated projects load (and the spec-level skip annotations
  // do their job).
  for (const role of roles) {
    const filePath = resolve(import.meta.dirname, AUTH_FILES[role]);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify({ cookies: [], origins: [] }));
  }
}
