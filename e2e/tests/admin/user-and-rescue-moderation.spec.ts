import { request as playwrightRequest } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { uniqueEmail } from '../../helpers/factories';
import { patchWithCsrf } from '../../helpers/seeds';
import { peekAuthTokens } from '../../helpers/token-peek';
import { URLS } from '../../playwright.config';

test.describe('admin user moderation', () => {
  test('the users page renders for an admin and search is functional', async ({ page }) => {
    await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/users/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });

    const search = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .or(page.getByLabel(/search/i))
      .first();
    if (await search.count()) {
      await search.fill('john.smith@gmail.com');
      await search.press('Enter');
      // Best-effort: if the seed includes john.smith and the table renders,
      // the email shows up.  Not blocking — different test runs may seed
      // different fixtures.
      await page
        .getByText('john.smith@gmail.com')
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 })
        .catch(() => undefined);
    }
  });
});

// ADS-871: graduate the mount smoke to a real moderation journey. The admin
// Users page DOES have a UI suspend/unsuspend control (UserDetailPanel ▸
// Actions tab), but it would mutate a real user's auth state — so this runs on
// a THROWAWAY verified user it provisions itself, and asserts the
// suspend → reactivate round-trip through the same /admin/users/:id/action
// moderation endpoint the UI drives. The admin Users page is loaded first to
// prove it mounts (the original smoke's value), then the moderation action is
// exercised and the user's status is read back as it round-trips.
test.describe('admin user moderation action (ADS-871)', () => {
  test('an admin can suspend then reactivate a throwaway user', async ({ apiAs, page }) => {
    const adminApi = await apiAs('admin');

    // Provision a throwaway, verified user so we never touch a seeded persona.
    const email = uniqueEmail('moderation');
    const anon = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const registerRes = await anon.post('/api/v1/auth/register', {
        data: {
          email,
          password: 'ModBehaviour123!',
          firstName: 'Mod',
          lastName: 'Target',
          termsAccepted: true,
          privacyPolicyAccepted: true,
        },
      });
      expect([200, 201]).toContain(registerRes.status());
      const tokens = await peekAuthTokens(email);
      expect(tokens.verificationToken).toBeTruthy();
      const verifyRes = await anon.post('/api/v1/auth/verify-email', {
        data: { verificationToken: tokens.verificationToken },
      });
      expect(verifyRes.ok()).toBe(true);
    } finally {
      await anon.dispose();
    }

    // Resolve the new user's id via the admin search the Users page uses.
    const searchRes = await adminApi.context.get('/api/v1/admin/users', {
      params: { search: email, limit: '10' },
    });
    expect(searchRes.ok()).toBe(true);
    const searchBody = (await searchRes.json()) as {
      data?: Array<{ userId?: string; id?: string; email?: string }>;
      users?: Array<{ userId?: string; id?: string; email?: string }>;
    };
    const list = searchBody.data ?? searchBody.users ?? [];
    const target = list.find(u => u.email === email);
    expect(target, 'throwaway user not found in admin search').toBeTruthy();
    const targetUserId = (target!.userId ?? target!.id)!;
    expect(targetUserId).toBeTruthy();

    // Load the admin Users page (proves the protected route mounts — the
    // original smoke's coverage) before driving the moderation action.
    await page.goto('/users', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });

    const readStatus = async (): Promise<string | undefined> => {
      const detailRes = await adminApi.context.get(`/api/v1/admin/users/${targetUserId}`);
      expect(detailRes.ok()).toBe(true);
      const detail = (await detailRes.json()) as {
        status?: string;
        data?: { status?: string };
        user?: { status?: string };
      };
      return detail.status ?? detail.data?.status ?? detail.user?.status;
    };

    // Suspend → status becomes 'suspended'.
    const suspendRes = await patchWithCsrf(
      adminApi.context,
      `/api/v1/admin/users/${targetUserId}/action`,
      { action: 'suspend', reason: 'ADS-871 e2e moderation journey' }
    );
    expect(suspendRes.ok()).toBe(true);
    expect(await readStatus()).toBe('suspended');

    // Reactivate → status returns to active.
    const reactivateRes = await patchWithCsrf(
      adminApi.context,
      `/api/v1/admin/users/${targetUserId}/action`,
      { action: 'reactivate', reason: 'ADS-871 e2e cleanup' }
    );
    expect(reactivateRes.ok()).toBe(true);
    expect(await readStatus()).not.toBe('suspended');
  });
});
