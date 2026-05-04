import { chromium, request, type FullConfig } from '@playwright/test';
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
      `Hint: ensure 'npm run docker:dev:detach' is running and ports 3000/3001/3002/5000 are free.`
  );
}

async function probeApiLogin(roleKey: RoleKey): Promise<void> {
  // Hit the backend's login endpoint directly (bypassing the React app and
  // the Vite proxy) so we can isolate "is the backend usable?" from any
  // frontend-specific failure.  The backend's CSRF middleware requires us
  // to fetch a token first — it sets a cookie that is paired with the token
  // value sent in the x-csrf-token header.
  const role = ROLES[roleKey];
  const ctx = await request.newContext({ baseURL: URLS.api });
  try {
    const csrfRes = await ctx.get('/api/v1/csrf-token', { timeout: 15_000 });
    if (!csrfRes.ok()) {
      throw new Error(
        `CSRF token fetch failed for ${roleKey}: ${csrfRes.status()} ${(await csrfRes.text()).slice(0, 300)}`
      );
    }
    const csrfBody = (await csrfRes.json()) as { csrfToken?: string };
    const csrfToken = csrfBody.csrfToken;
    if (!csrfToken) {
      throw new Error(`CSRF token endpoint returned no token: ${JSON.stringify(csrfBody)}`);
    }

    const response = await ctx.post('/api/v1/auth/login', {
      data: { email: role.email, password: role.password },
      headers: { 'x-csrf-token': csrfToken },
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

async function loginAndPersist(roleKey: RoleKey): Promise<void> {
  const role = ROLES[roleKey];
  const browser = await chromium.launch();
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof browser.newContext>>['newPage']>> | null =
    null;
  // Collect diagnostic signals during the run so we can surface them on failure.
  const consoleEvents: string[] = [];
  const networkEvents: string[] = [];
  try {
    const context = await browser.newContext({ baseURL: role.appUrl });
    page = await context.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleEvents.push(`[${msg.type()}] ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      consoleEvents.push(`[pageerror] ${err.message}`);
    });
    page.on('requestfailed', req => {
      networkEvents.push(`[failed] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
    });
    page.on('response', async res => {
      const url = res.url();
      if (/\/api\/v1\/(auth|csrf)/i.test(url)) {
        let body = '';
        try {
          body = (await res.text()).slice(0, 500);
        } catch {
          body = '<unreadable>';
        }
        networkEvents.push(`[${res.status()}] ${res.request().method()} ${url} ${body}`);
      }
    });

    // First request to a Vite dev server is slow because the bundle is
    // compiled on demand — be generous with the navigation budget.
    await page.goto('/login', { timeout: 60_000, waitUntil: 'domcontentloaded' });

    // Wait for the form to mount before typing into it.
    const emailField = page.getByLabel(/email/i).first();
    await emailField.waitFor({ state: 'visible', timeout: 60_000 });
    const passwordField = page.getByLabel(/password/i).first();
    await passwordField.waitFor({ state: 'visible', timeout: 30_000 });

    await emailField.fill(role.email);
    await passwordField.fill(role.password);

    const submit = page.getByRole('button', { name: /^(sign in|log ?in)$/i }).first();
    await Promise.all([
      page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 30_000 }),
      submit.click(),
    ]);

    // Playwright's storageState preserves cookies + localStorage, but NOT
    // sessionStorage — and lib.auth's auth-service stores the access token
    // in sessionStorage.  Without it, AuthContext.isAuthenticated() flips
    // to false on test load and ProtectedRoute redirects every admin /
    // rescue route to /login.  AuthContext has a "dev_user" localStorage
    // shortcut for exactly this case (development mode bypass).  Copy the
    // `user` blob into `dev_user` so the next session resumes cleanly.
    // The httpOnly accessToken cookie is still the source of truth for
    // API auth — the dev shortcut only restores the React-side identity.
    await page.evaluate(() => {
      const user = window.localStorage.getItem('user');
      if (user) {
        window.localStorage.setItem('dev_user', user);
      }
    });

    const filePath = resolve(import.meta.dirname, AUTH_FILES[roleKey]);
    mkdirSync(dirname(filePath), { recursive: true });
    await context.storageState({ path: filePath });
  } catch (error) {
    // Drop diagnostic artefacts so future runs leave evidence even when the
    // failure is environmental rather than test-logic.
    if (page) {
      const dumpDir = resolve(import.meta.dirname, 'test-results', 'global-setup');
      mkdirSync(dumpDir, { recursive: true });
      await page
        .screenshot({ path: resolve(dumpDir, `${roleKey}-failure.png`), fullPage: true })
        .catch(() => undefined);
      const html = await page.content().catch(() => '');
      writeFileSync(resolve(dumpDir, `${roleKey}-failure.html`), html);
      writeFileSync(
        resolve(dumpDir, `${roleKey}-console.log`),
        consoleEvents.join('\n') || '<no console events>'
      );
      writeFileSync(
        resolve(dumpDir, `${roleKey}-network.log`),
        networkEvents.join('\n') || '<no network events>'
      );
      const url = page.url();
      // Re-throw with the diagnostic events folded into the error message so
      // the Playwright reporter prints them inline (the file dumps are easy
      // to miss in the artifact, but the error message ends up in stderr and
      // in the HTML report).
      const summary = [
        `global-setup: ${roleKey} login failed at ${url}`,
        `console events (${consoleEvents.length}):`,
        consoleEvents.slice(-20).join('\n') || '  <none>',
        `network events (${networkEvents.length}):`,
        networkEvents.slice(-20).join('\n') || '  <none>',
      ].join('\n');
      const err = error instanceof Error ? error : new Error(String(error));
      err.message = `${err.message}\n${summary}`;
      throw err;
    }
    throw error;
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
  // Probe the backend with each role's credentials before touching the UI.
  // If the API rejects the seeded credentials we want a sharp error that
  // points at the backend rather than a 30-second waitForURL timeout.
  for (const role of roles) {
    await probeApiLogin(role);
  }
  for (const role of roles) {
    await loginAndPersist(role);
  }
}
