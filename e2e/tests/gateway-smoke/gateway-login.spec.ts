import { expect, request as playwrightRequest, test } from '@playwright/test';

import { fetchCsrfToken } from '../../helpers/csrf';
import { URLS } from '../../playwright.config';
import { ROLES, type RoleKey } from '../../fixtures/roles';

/**
 * Gateway smoke — the minimum signal CI gets today (Phase 11 follow-up).
 *
 * What we gate on:
 *
 *   1. The gateway is reachable on the documented health endpoint.
 *   2. Each seeded persona logs in cleanly through POST /api/v1/auth/login
 *      and the session is established. Under ADS-919 the token pair rides
 *      home as httpOnly cookies (not in the body), so success is proven by
 *      the `accessToken` cookie being set plus the `user` echo — and the
 *      login POST carries the CSRF double-submit header like the SPA.
 *
 * If either regresses, this spec fails — the smallest meaningful smoke we can
 * offer without lying about coverage.
 */
test.describe('gateway smoke', () => {
  test('health endpoint reports ok @smoke', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const res = await ctx.get('/health/simple', { timeout: 15_000 });
      expect(res.ok()).toBe(true);
      const body = (await res.json()) as { status?: string; service?: string };
      expect(body.status).toBe('ok');
      expect(body.service).toBe('service.gateway');
    } finally {
      await ctx.dispose();
    }
  });

  const roles: RoleKey[] = ['adopter', 'rescue', 'admin'];
  for (const roleKey of roles) {
    test(`seeded ${roleKey} can log in via the gateway @smoke`, async () => {
      const role = ROLES[roleKey];
      const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
      try {
        const csrfToken = await fetchCsrfToken(ctx);
        const res = await ctx.post('/api/v1/auth/login', {
          data: { email: role.email, password: role.password },
          headers: { 'x-csrf-token': csrfToken },
          timeout: 15_000,
        });
        if (!res.ok()) {
          throw new Error(
            `login failed for ${roleKey} (${role.email}): ${res.status()} ${(await res.text()).slice(0, 500)}`
          );
        }
        // ADS-919: the session is delivered as httpOnly cookies, not a body
        // token. Prove it landed via the context's cookie jar + the user echo.
        const { cookies } = await ctx.storageState();
        expect(cookies.some(c => c.name === 'accessToken' && c.value.length > 0)).toBe(true);
        const body = (await res.json()) as { user?: { email?: string } };
        expect(body.user?.email).toBe(role.email);
      } finally {
        await ctx.dispose();
      }
    });
  }
});
