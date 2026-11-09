import { request as playwrightRequest, type Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { openAccountContext } from '../../helpers/cross-app-sessions';
import { postWithCsrf } from '../../helpers/seeds';
import { createRescueWithOwner } from '../../helpers/throwaway-rescue';
import { URLS } from '../../playwright.config';

// The shared account settings (lib.account) at /user-settings in the rescue
// app. Each test uses a rescue of its own whose owner is its only staff
// member, so nothing here touches the shared Paws Rescue or its personas.

const canSignIn = async (email: string, password: string): Promise<boolean> => {
  const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const res = await postWithCsrf(ctx, '/api/v1/auth/login', { email, password });
    return res.ok();
  } finally {
    await ctx.dispose();
  }
};

// Inactive tab panels stay mounted (hidden); role queries skip hidden
// elements, so this is the panel the user is looking at.
const activePanel = (page: Page) => page.getByRole('tabpanel');

test.describe('rescue staff account settings', () => {
  test('the only staff member of a rescue cannot delete their account', async ({
    apiAs,
    browser,
  }) => {
    const rescue = await createRescueWithOwner(await apiAs('admin'), 'SoleStaff');
    const context = await openAccountContext(browser, rescue.owner, URLS.rescue);
    try {
      const page = await context.newPage();
      await page.goto('/user-settings#account');
      await activePanel(page).getByRole('button', { name: 'Delete account…' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Current password').fill(rescue.owner.password);
      await dialog.getByRole('button', { name: 'Delete my account' }).click();

      // Erasing the last staff member would orphan the rescue (409
      // last_rescue_staff from the erasure route).
      await expect(dialog.getByText(/last staff member of your rescue/i)).toBeVisible();
      expect(await canSignIn(rescue.owner.email, rescue.owner.password)).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('staff can change their name from account settings', async ({ apiAs, browser }) => {
    const rescue = await createRescueWithOwner(await apiAs('admin'), 'RenameStaff');
    const context = await openAccountContext(browser, rescue.owner, URLS.rescue);
    try {
      const page = await context.newPage();
      await page.goto('/user-settings#account');
      await activePanel(page).getByLabel('First name').fill('Renamed');
      await activePanel(page).getByRole('button', { name: 'Save details' }).click();
      await expect(activePanel(page).getByText('Details saved.')).toBeVisible();

      await page.reload();
      await expect(activePanel(page).getByLabel('First name')).toHaveValue('Renamed');
    } finally {
      await context.close();
    }
  });
});
