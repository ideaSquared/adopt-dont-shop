import { request as playwrightRequest } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { uniqueEmail } from '../../helpers/factories';
import { patchWithCsrf, postWithCsrf } from '../../helpers/seeds';
import { peekAuthTokens } from '../../helpers/token-peek';
import { URLS } from '../../playwright.config';

test.describe('admin user moderation', () => {
  test('searching the users page finds a new adopter and shows their account details', async ({
    page,
  }) => {
    const account = await createVerifiedAdopter('user-search');

    await page.goto('/users');
    await page.getByPlaceholder(/search by name or email/i).fill(account.email);
    // Header row + the one match: the debounced search has settled.
    await expect(page.getByRole('row')).toHaveCount(2, { timeout: 30_000 });
    const row = page.getByRole('row').filter({ hasText: account.email });
    await expect(row.getByText('E2E Adopter')).toBeVisible();
    await expect(row.getByRole('cell', { name: 'Adopter', exact: true })).toBeVisible();
    await expect(row.getByRole('cell', { name: 'Active', exact: true })).toBeVisible();

    await row.getByRole('cell').filter({ hasText: account.email }).click();
    await expect(page).toHaveURL(/\/users\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('tab', { name: 'Actions' })).toBeVisible();
    await expect(page.getByText(account.email).first()).toBeVisible();

    // A search nobody matches shows the empty state instead of stale rows.
    await page.getByPlaceholder(/search by name or email/i).fill(`no-such-${account.email}`);
    await expect(page.getByText(/no users found matching your criteria/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('row').filter({ hasText: account.email })).toHaveCount(0);
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
      const registerRes = await postWithCsrf(anon, '/api/v1/auth/register', {
        email,
        password: 'ModBehaviour123!',
        firstName: 'Mod',
        lastName: 'Target',
        termsAccepted: true,
        privacyPolicyAccepted: true,
      });
      expect([200, 201]).toContain(registerRes.status());
      const tokens = await peekAuthTokens(email);
      expect(tokens.verificationToken).toBeTruthy();
      const verifyRes = await postWithCsrf(anon, '/api/v1/auth/verify-email', {
        verificationToken: tokens.verificationToken,
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
