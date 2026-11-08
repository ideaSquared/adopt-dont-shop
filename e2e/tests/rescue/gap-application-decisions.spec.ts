import type { Browser, BrowserContext, Page } from '@playwright/test';

import { test, expect, type ApiClient } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { openAccountContext } from '../../helpers/cross-app-sessions';
import { uniqueText } from '../../helpers/factories';
import { createAdopterApplication } from '../../helpers/seeds';
import { URLS } from '../../playwright.config';

/**
 * RES-032 / RES-033: a rescue approves or rejects an application in its app and
 * the adopter sees the outcome in the client app, with a notification.
 * RES-035: /applications/:id opens that application.
 *
 * Each test applies as its own throwaway adopter, so the adopter's
 * notifications and application list hold only what the test caused.
 */
type Submitted = {
  applicationId: string;
  petName: string;
  adopterContext: BrowserContext;
};

const submitApplication = async (browser: Browser, rescueApi: ApiClient): Promise<Submitted> => {
  const account = await createVerifiedAdopter('decision');
  const adopterApi = await loginAccountViaApi(account);
  try {
    const { applicationId, petId } = await createAdopterApplication(adopterApi, rescueApi);
    const { data: pet } = (await (await rescueApi.context.get(`/api/v1/pets/${petId}`)).json()) as {
      data: { name: string };
    };
    const adopterContext = await openAccountContext(browser, account, URLS.client);
    return { applicationId, petName: pet.name, adopterContext };
  } finally {
    await adopterApi.dispose();
  }
};

const openReview = async (page: Page, petName: string): Promise<void> => {
  await page.goto('/applications');
  await dismissCookieBannerWhenShown(page);
  const row = page.getByRole('row').filter({ hasText: petName });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByRole('button', { name: 'View' }).click();
  await expect(page.getByRole('button', { name: 'Transition Stage' })).toBeVisible();
};

const transition = async (
  page: Page,
  action: RegExp,
  options: { choice?: string; notes?: string } = {}
): Promise<void> => {
  await page.getByRole('button', { name: 'Transition Stage' }).click();
  await page.getByRole('button', { name: action }).click();
  if (options.choice) {
    await page.getByRole('button', { name: options.choice, exact: true }).click();
  }
  if (options.notes) {
    await page.getByLabel('Notes (optional)').fill(options.notes);
  }
  await page.getByRole('button', { name: 'Confirm Transition' }).click();
  await expect(page.getByRole('heading', { name: 'Transition Application Stage' })).toBeHidden();
};

test.describe('deciding on an application', () => {
  test('RES-032: an approved application shows as approved to the adopter, with a notification', async ({
    page,
    apiAs,
    browser,
  }) => {
    const { petName, adopterContext } = await submitApplication(browser, await apiAs('rescue'));
    try {
      await openReview(page, petName);
      await transition(page, /begin reviewing/i);
      await transition(page, /make the final approval/i, { choice: 'Approve' });
      await expect(
        page
          .getByRole('row')
          .filter({ hasText: petName })
          .getByRole('cell', { name: 'Approved', exact: true })
      ).toBeVisible({ timeout: 15_000 });

      const adopter = await adopterContext.newPage();
      await adopter.goto('/applications');
      // The throwaway adopter has this one application, so the status on the page is its status.
      await expect(adopter.getByRole('heading', { name: new RegExp(petName) })).toBeVisible({
        timeout: 20_000,
      });
      await expect(adopter.getByText('Approved', { exact: true })).toBeVisible();

      await adopter.goto('/notifications');
      await expect(adopter.getByText('Application approved!')).toBeVisible({ timeout: 20_000 });
    } finally {
      await adopterContext.close();
    }
  });

  test('RES-033: a rejected application shows as rejected to the adopter, with the reason in a notification', async ({
    page,
    apiAs,
    browser,
  }) => {
    const { petName, adopterContext } = await submitApplication(browser, await apiAs('rescue'));
    const reason = uniqueText('Garden is not secure enough');
    try {
      await openReview(page, petName);
      await transition(page, /reject application/i, { notes: reason });
      await expect(
        page
          .getByRole('row')
          .filter({ hasText: petName })
          .getByRole('cell', { name: 'Rejected', exact: true })
      ).toBeVisible({ timeout: 15_000 });

      const adopter = await adopterContext.newPage();
      await adopter.goto('/applications');
      // The throwaway adopter has this one application, so the status on the page is its status.
      await expect(adopter.getByRole('heading', { name: new RegExp(petName) })).toBeVisible({
        timeout: 20_000,
      });
      await expect(adopter.getByText('Rejected', { exact: true })).toBeVisible();

      await adopter.goto('/notifications');
      await expect(adopter.getByText('Application update')).toBeVisible({ timeout: 20_000 });
      await expect(adopter.getByText(reason)).toBeVisible();
    } finally {
      await adopterContext.close();
    }
  });

  test('RES-035: /applications/:id opens that application for review', async ({
    page,
    apiAs,
    browser,
  }) => {
    const { applicationId, petName, adopterContext } = await submitApplication(
      browser,
      await apiAs('rescue')
    );
    await adopterContext.close();

    await page.goto(`/applications/${applicationId}`);
    await dismissCookieBannerWhenShown(page);

    await expect(page).toHaveURL(new RegExp(`/applications/${applicationId}$`));
    await expect(page.getByRole('button', { name: 'Transition Stage' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole('term').filter({ hasText: 'Why do you want to adopt this pet?' })
    ).toBeVisible();
    await expect(page.getByText(petName).first()).toBeVisible();
  });
});
