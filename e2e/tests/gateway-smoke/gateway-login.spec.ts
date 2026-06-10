import { expect, request as playwrightRequest, test } from '@playwright/test';

import { URLS } from '../../playwright.config';
import { ROLES, type RoleKey } from '../../fixtures/roles';

/**
 * Gateway smoke — the minimum signal CI gets today (Phase 11 follow-up).
 *
 * The full app-driven Playwright suite is parked while lib.auth and the
 * three React apps are reworked against the gateway's Bearer-token auth
 * contract (the deleted monolith used httpOnly cookies + CSRF, the gateway
 * returns `{ user, tokens: { accessToken, refreshToken } }` in the JSON
 * body). What we CAN gate on right now:
 *
 *   1. The gateway is reachable on the documented health endpoint.
 *   2. Each seeded persona (#1000) logs in cleanly through
 *      POST /api/v1/auth/login and the response contains an accessToken.
 *
 * If either regresses, this spec fails — which is the smallest meaningful
 * smoke we can offer without lying about coverage. Re-add `test-e2e` to
 * branch protection's `ci-required` once lib.auth is reworked and the
 * legacy specs are re-enabled.
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
        const res = await ctx.post('/api/v1/auth/login', {
          data: { email: role.email, password: role.password },
          timeout: 15_000,
        });
        if (!res.ok()) {
          throw new Error(
            `login failed for ${roleKey} (${role.email}): ${res.status()} ${(await res.text()).slice(0, 500)}`
          );
        }
        const body = (await res.json()) as {
          tokens?: { accessToken?: string; access_token?: string };
          user?: { email?: string };
        };
        const accessToken = body.tokens?.accessToken ?? body.tokens?.access_token;
        expect(accessToken).toBeTruthy();
        expect(body.user?.email).toBe(role.email);
      } finally {
        await ctx.dispose();
      }
    });
  }
});
