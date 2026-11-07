import type { Browser, Page } from '@playwright/test';

import { test, expect, type ApiClient } from '../../fixtures';
import { loginAccountViaApi } from '../../helpers/accounts';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { uniquePetName } from '../../helpers/factories';
import { createFreshRescue, removeFreshRescue, type FreshRescue } from '../../helpers/fresh-rescue';
import { petCardLocator } from '../../helpers/pet';
import { expectOk, postWithCsrf } from '../../helpers/seeds';
import { URLS } from '../../playwright.config';

/**
 * Approving, rejecting and suspending a rescue from the admin Rescues page
 * (ADM-031, ADM-032). Each test provisions its own throwaway rescue and
 * manager, and removes the rescue afterwards.
 */

const withFreshRescue = async (
  adminApi: ApiClient,
  label: string,
  body: (rescue: FreshRescue) => Promise<void>
): Promise<void> => {
  const rescue = await createFreshRescue(adminApi, label);
  try {
    await body(rescue);
  } finally {
    await removeFreshRescue(adminApi, rescue.rescueId);
  }
};

const rescueRow = (page: Page, rescue: FreshRescue) =>
  page.getByRole('row').filter({ hasText: rescue.name });

const findRescueInAdmin = async (page: Page, rescue: FreshRescue): Promise<void> => {
  await page.goto('/rescues');
  await dismissCookieBannerPatiently(page);
  await page.getByPlaceholder('Search by name, city, or email...').fill(rescue.name);
  await expect(rescueRow(page, rescue)).toHaveCount(1, { timeout: 30_000 });
};

const openRescueApp = async (browser: Browser): Promise<Page> => {
  const context = await browser.newContext({
    baseURL: URLS.rescue,
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await dismissCookieBannerPatiently(page);
  return page;
};

const publishPetAsManager = async (rescue: FreshRescue): Promise<string> => {
  const managerApi = await loginAccountViaApi(rescue.manager);
  try {
    const name = uniquePetName('Gate');
    const res = await postWithCsrf(managerApi.context, '/api/v1/pets', {
      name,
      type: 'dog',
      gender: 'female',
      size: 'medium',
      ageGroup: 'adult',
      shortDescription: 'e2e rescue gating',
      rescueId: rescue.rescueId,
    });
    await expectOk(res, 'rescue manager creates a pet');
    return name;
  } finally {
    await managerApi.dispose();
  }
};

const verifyRescueViaApi = async (adminApi: ApiClient, rescue: FreshRescue): Promise<void> => {
  const verified = await postWithCsrf(
    adminApi.context,
    `/api/v1/rescues/${rescue.rescueId}/verify`
  );
  await expectOk(verified, 'verify rescue');
};

const suspendRescueViaApi = async (adminApi: ApiClient, rescue: FreshRescue): Promise<void> => {
  const suspended = await postWithCsrf(adminApi.context, '/api/v1/rescues/bulk-update', {
    rescueIds: [rescue.rescueId],
    action: 'suspend',
    reason: 'E2E: policy breach',
  });
  await expectOk(suspended, 'suspend rescue');
};

test.describe('approving a pending rescue (ADM-031)', () => {
  test('an admin approves a pending rescue and its manager can then manage pets', async ({
    page,
    apiAs,
    browser,
  }) => {
    await withFreshRescue(await apiAs('admin'), 'approve', async rescue => {
      await findRescueInAdmin(page, rescue);
      const row = rescueRow(page, rescue);
      await expect(row.getByText('Pending Review')).toBeVisible();

      await row.getByRole('button', { name: 'Approve' }).click();
      await expect(page.getByRole('heading', { name: 'Approve Rescue' })).toBeVisible();
      await page.getByRole('button', { name: 'Approve Rescue' }).click();

      await expect(row.getByText('Verified', { exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(row.getByText('Pending Review')).toHaveCount(0);

      const rescueApp = await openRescueApp(browser);
      try {
        await loginViaUI(rescueApp, rescue.manager.email, rescue.manager.password);
        await expect(
          rescueApp.getByRole('heading', { level: 1, name: 'Rescue Dashboard' })
        ).toBeVisible({ timeout: 30_000 });
        await rescueApp.goto('/pets');
        await expect(
          rescueApp.getByRole('heading', { level: 1, name: 'Pet Management' })
        ).toBeVisible({ timeout: 30_000 });
        await expect(rescueApp.getByRole('heading', { name: 'Rescue Setup Required' })).toHaveCount(
          0
        );
      } finally {
        await rescueApp.context().close();
      }

      const petName = await publishPetAsManager(rescue);
      expect(petName).toContain('Gate');
    });
  });

  // BUG: pet creation never checks the rescue's status, so the staff of a rescue
  // that is still "pending" can create pets before an admin has approved it.
  test.fail('a pending rescue cannot create pets until an admin approves it', async ({ apiAs }) => {
    await withFreshRescue(await apiAs('admin'), 'pending', async rescue => {
      await expect(publishPetAsManager(rescue)).rejects.toThrow(/403|forbidden|pending/i);
    });
  });
});

test.describe('suspending or rejecting a rescue (ADM-032)', () => {
  test('an admin suspends an approved rescue from the Rescues page', async ({ page, apiAs }) => {
    const adminApi = await apiAs('admin');
    await withFreshRescue(adminApi, 'suspend-ui', async rescue => {
      await verifyRescueViaApi(adminApi, rescue);

      await findRescueInAdmin(page, rescue);
      const row = rescueRow(page, rescue);
      await expect(row.getByText('Verified', { exact: true })).toBeVisible();
      await row.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Suspend', exact: true }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Suspend 1 rescue?')).toBeVisible();
      await dialog
        .getByPlaceholder('Explain why these rescues are being suspended...')
        .fill('E2E: policy breach');
      await dialog.getByRole('button', { name: 'Suspend Rescues' }).click();
      await expect(dialog.getByText(/1 .*succe/i)).toBeVisible({ timeout: 30_000 });

      const stored = await adminApi.context.get(`/api/v1/rescues/${rescue.rescueId}`);
      expect(((await stored.json()) as { data: { status: string } }).data.status).toBe('suspended');
    });
  });

  test('an admin rejects a pending rescue and it is marked Rejected', async ({ page, apiAs }) => {
    // The reject modal (three info boxes + two text areas) is taller than the default
    // 720px viewport and does not scroll, which leaves its footer buttons unreachable.
    await page.setViewportSize({ width: 1280, height: 1200 });
    await withFreshRescue(await apiAs('admin'), 'reject-ui', async rescue => {
      await findRescueInAdmin(page, rescue);
      const row = rescueRow(page, rescue);
      await row.getByRole('button', { name: 'Reject' }).click();

      await expect(page.getByRole('heading', { name: 'Reject Rescue' })).toBeVisible();
      await page.getByLabel(/Rejection Reason/).fill('E2E: could not verify the charity number');
      await page.getByRole('button', { name: 'Reject Rescue' }).click();

      await expect(row.getByText('Rejected', { exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(row.getByRole('button', { name: 'Approve' })).toHaveCount(0);
    });
  });

  // BUG: nothing checks the rescue's status after sign-in, so the staff of a
  // suspended rescue still reach the rescue app dashboard.
  test.fail(
    'the staff of a suspended rescue cannot sign in to the rescue app',
    async ({ apiAs, browser }) => {
      const adminApi = await apiAs('admin');
      await withFreshRescue(adminApi, 'suspend-login', async rescue => {
        await suspendRescueViaApi(adminApi, rescue);

        const rescueApp = await openRescueApp(browser);
        try {
          await rescueApp.goto('/login');
          await rescueApp.getByLabel(/email/i).first().fill(rescue.manager.email);
          await rescueApp
            .getByLabel(/password/i)
            .first()
            .fill(rescue.manager.password);
          await rescueApp.getByRole('button', { name: /^(sign in|log ?in)$/i }).click();

          await expect(rescueApp.getByRole('alert')).toBeVisible({ timeout: 30_000 });
          await expect(rescueApp).toHaveURL(/\/login$/);
        } finally {
          await rescueApp.context().close();
        }
      });
    }
  );

  // BUG: the public pet search and GET /pets ignore the owning rescue's status, so
  // the pets of a suspended rescue stay listed for adopters (confirmed via GET /pets).
  // Fixme rather than fail: the client search sometimes hides them anyway, so the
  // outcome is not deterministic.
  test.fixme("a suspended rescue's pets disappear from the client search", async ({
    apiAs,
    browser,
  }) => {
    const adminApi = await apiAs('admin');
    await withFreshRescue(adminApi, 'suspend-pets', async rescue => {
      await verifyRescueViaApi(adminApi, rescue);
      const petName = await publishPetAsManager(rescue);

      const visitorContext = await browser.newContext({
        baseURL: URLS.client,
        storageState: { cookies: [], origins: [] },
      });
      try {
        const visitor = await visitorContext.newPage();
        await dismissCookieBannerPatiently(visitor);
        await visitor.goto(`/search?q=${encodeURIComponent(petName)}`);
        await expect(petCardLocator(visitor).filter({ hasText: petName }).first()).toBeVisible({
          timeout: 30_000,
        });

        await suspendRescueViaApi(adminApi, rescue);

        await visitor.goto(`/search?q=${encodeURIComponent(petName)}`);
        await expect(visitor.getByText(/no pets match your filters/i)).toBeVisible({
          timeout: 30_000,
        });
        await expect(petCardLocator(visitor).filter({ hasText: petName })).toHaveCount(0);
      } finally {
        await visitorContext.close();
      }
    });
  });
});
