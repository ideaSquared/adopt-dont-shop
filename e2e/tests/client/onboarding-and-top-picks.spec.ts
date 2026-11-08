import type { Browser, Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { URLS } from '../../playwright.config';
import { createVerifiedAdopter, loginAccountViaApi, type Account } from '../../helpers/accounts';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { skipSwipeIntro } from '../../helpers/swipe-intro';

/**
 * A new adopter completes the match-profile wizard and lands on their top
 * picks. Manual QA: CLI-090 and CLI-092. Runs on a throwaway account so the
 * saved profile can't leak into the seeded personas other specs use.
 */
async function signedInNewAdopter(
  browser: Browser
): Promise<{ page: Page; account: Account; close: () => Promise<void> }> {
  const account = await createVerifiedAdopter('onboard');
  const context = await browser.newContext({
    baseURL: URLS.client,
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await skipSwipeIntro(page);
  await loginViaUI(page, account.email, account.password);
  await dismissCookieBannerWhenShown(page);
  // Reach the wizard the way a new adopter does, via the navbar. A hard load of
  // /onboarding is racy: the wizard restores the saved profile when its
  // GET /match/profile lands after the session rehydrates, which overwrites any
  // answer clicked before then.
  await page
    .getByRole('link', { name: /top picks/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/onboarding$/);
  // Let the session and profile requests settle before answering anything.
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  return { page, account, close: () => context.close() };
}
async function walkToReview(page: Page, options: { pickDogs: boolean }): Promise<void> {
  // The wizard shows a spinner until the saved profile has loaded.
  await expect(page.getByRole('heading', { name: 'Home & Lifestyle' })).toBeVisible({
    timeout: 30_000,
  });
  const review = page.getByRole('heading', { name: 'Review & Submit' });

  // The wizard can re-fetch the saved profile after the form is already
  // showing and reset whatever was answered meanwhile, so walk the steps and
  // check the review; if an answer was lost, go back to step 1 and redo it.
  await expect(async () => {
    if (await review.isVisible()) {
      await page.getByRole('button', { name: 'Edit' }).first().click();
    }
    for (const answer of ['House', 'No children', 'No other pets', 'No allergies']) {
      await page.getByRole('radio', { name: answer }).check();
    }
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('heading', { name: 'Pet Preferences' })).toBeVisible();
    if (options.pickDogs) {
      // The chip's checkbox is visually hidden under its label, so the label's
      // own icon takes the pointer event; force the check through.
      await page.getByRole('checkbox', { name: 'Dog', exact: true }).check({ force: true });
    }
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('heading', { name: 'Discovery Settings' })).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(review).toBeVisible();
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
    // The review shows the answers back before saving.
    await expect(page.getByText('House', { exact: true })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 45_000 });
}

async function finishWizard(page: Page, options: { pickDogs: boolean }): Promise<void> {
  await walkToReview(page, options);
  await page.getByRole('button', { name: 'Save preferences' }).click();
}

function topPickCards(page: Page) {
  return page.getByRole('link').filter({ has: page.getByRole('heading', { level: 3 }) });
}

test.describe('onboarding wizard and top picks', () => {
  test('answering the wizard saves the profile and sends the adopter to top picks', async ({
    browser,
  }) => {
    const { page, account, close } = await signedInNewAdopter(browser);
    try {
      await finishWizard(page, { pickDogs: false });

      await expect(page).toHaveURL(/\/match\/top-picks$/);

      // The answers were saved against the account.
      const api = await loginAccountViaApi(account);
      try {
        const res = await api.context.get('/api/v1/match/profile');
        const body = (await res.json()) as {
          data?: { lifestyle?: { housing_type?: string; children_type?: string } };
        };
        expect(body.data?.lifestyle?.housing_type).toBe('house');
        expect(body.data?.lifestyle?.children_type).toBe('none');
      } finally {
        await api.dispose();
      }
    } finally {
      await close();
    }
  });

  // Saving the wizard used to store preferences wrongly (fixed in #1603).
  test('top picks lists pets after the wizard is completed', async ({ browser }) => {
    const { page, close } = await signedInNewAdopter(browser);
    try {
      await finishWizard(page, { pickDogs: false });

      await expect(page.getByRole('heading', { name: 'Top picks for you' })).toBeVisible({
        timeout: 20_000,
      });
      await expect(topPickCards(page).first()).toBeVisible();
    } finally {
      await close();
    }
  });

  // UpsertMatchProfile used to bind JS arrays to `::jsonb` parameters and fail
  // with a 500 (fixed in #1603).
  test('a chosen pet type is saved and top picks only shows that type', async ({ browser }) => {
    const { page, close } = await signedInNewAdopter(browser);
    try {
      await finishWizard(page, { pickDogs: true });

      await expect(page).toHaveURL(/\/match\/top-picks$/);
      await expect(topPickCards(page).first()).toBeVisible({ timeout: 20_000 });
      for (const text of await topPickCards(page).allInnerTexts()) {
        expect(text).toMatch(/dog/i);
      }
    } finally {
      await close();
    }
  });
});
