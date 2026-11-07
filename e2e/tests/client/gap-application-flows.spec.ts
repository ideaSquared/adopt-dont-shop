import type { Locator, Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import type { ApiClient } from '../../fixtures/api';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { answerEveryApplicationStep } from '../../helpers/application-form';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import {
  createAdopterApplication,
  createAvailablePet,
  expectOk,
  patchWithCsrf,
  postWithCsrf,
} from '../../helpers/seeds';
import { openSignedInSession } from '../../helpers/signed-in-session';

const DISPLAY_DATE = /\d{1,2} [A-Z][a-z]{2} \d{4}/;

type ApplicationView = { id: string; petId: string; status: string };

/** The My Applications card for one pet (the innermost block holding its heading and button). */
const applicationCard = (page: Page, petName: string): Locator =>
  page
    .locator('main div')
    .filter({ has: page.getByRole('heading', { level: 3, name: petName }) })
    .filter({ has: page.getByRole('button', { name: 'View Details' }) })
    .last();

const listApplications = async (api: ApiClient, petId: string): Promise<ApplicationView[]> => {
  const res = await api.context.get('/api/v1/applications', { params: { limit: 100 } });
  await expectOk(res, 'list own applications');
  const body = (await res.json()) as { data: ApplicationView[] };
  return body.data.filter(a => a.petId === petId);
};

const petNameOf = async (rescueApi: ApiClient, petId: string): Promise<string> => {
  const res = await rescueApi.context.get(`/api/v1/pets/${petId}`);
  await expectOk(res, 'read pet name');
  const body = (await res.json()) as { name?: string; data?: { name?: string } };
  const name = body.data?.name ?? body.name;
  if (!name) {
    throw new Error(`pet ${petId} has no name`);
  }
  return name;
};

const decide = async (
  rescueApi: ApiClient,
  applicationId: string,
  status: 'approved' | 'rejected'
): Promise<void> => {
  const review = await postWithCsrf(
    rescueApi.context,
    `/api/v1/applications/${applicationId}/review`,
    {}
  );
  await expectOk(review, 'rescue starts the review');
  const decision = await patchWithCsrf(
    rescueApi.context,
    `/api/v1/applications/${applicationId}/status`,
    { status, ...(status === 'rejected' ? { notes: 'Not a fit for this home' } : {}) }
  );
  await expectOk(decision, `rescue sets ${status}`);
};

test.describe('client application journeys', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // CLI-070
  test('applying through the form lands on My Applications as Submitted', async ({
    browser,
    apiAs,
  }) => {
    const { petId, name: petName } = await createAvailablePet(await apiAs('rescue'), 'ApplySub');
    const session = await openSignedInSession(browser, await createVerifiedAdopter('apply-sub'));
    const { page } = session;
    try {
      await dismissCookieBannerPatiently(page);
      await page.goto(`/apply/${petId}`);
      // The form re-seeds its answers once the profile finishes loading; answering
      // before that settles can be wiped.
      await page.waitForLoadState('networkidle');
      await answerEveryApplicationStep(page);
      await page.getByRole('checkbox', { name: /references have agreed/i }).check();
      await page.getByRole('button', { name: /send my application/i }).click();
      await expect(page.getByRole('heading', { name: /application sent/i })).toBeVisible({
        timeout: 20_000,
      });

      await page.goto('/applications');
      const card = applicationCard(page, petName);
      await expect(card).toBeVisible({ timeout: 20_000 });
      await expect(card.getByText('Submitted', { exact: true })).toBeVisible();

      const stored = await listApplications(session.api, petId);
      expect(stored.map(a => a.status)).toEqual(['submitted']);
    } finally {
      await session.close();
    }
  });

  // CLI-071 (required-field half; the questionnaire has no phone or postcode
  // question, so the UK formats are covered on the profile form in CLI-081)
  test('continuing with required answers missing is blocked and each gap is named', async ({
    browser,
    apiAs,
  }) => {
    const { petId } = await createAvailablePet(await apiAs('rescue'), 'ApplyReq');
    const session = await openSignedInSession(browser, await createVerifiedAdopter('apply-req'));
    const { page } = session;
    try {
      await dismissCookieBannerPatiently(page);
      await page.goto(`/apply/${petId}`);
      const status = page.getByText(/^Step \d+ of \d+/).first();
      await expect(status).toBeVisible({ timeout: 20_000 });
      const stepBefore = (await status.textContent()) ?? '';

      await page.getByRole('button', { name: /continue/i }).click();
      const alert = page
        .getByRole('alert')
        .filter({ hasText: /required fields? (is|are) missing/i });
      await expect(alert).toBeVisible();
      await expect(alert.locator('li').first()).toBeVisible();
      const flagged = await alert.locator('li').count();
      expect(flagged).toBeGreaterThan(1);
      await expect(status).toHaveText(stepBefore);
      await expect(page.getByText(/Don.t forget this one/).first()).toBeVisible();

      // Answering one question removes only that gap; the step is still blocked.
      await page.locator('main').getByRole('radiogroup').first().locator('label').first().click();
      await page.getByRole('button', { name: /continue/i }).click();
      await expect(alert.locator('li')).toHaveCount(flagged - 1);
      await expect(status).toHaveText(stepBefore);

      expect(await listApplications(session.api, petId)).toEqual([]);
    } finally {
      await session.close();
    }
  });

  // CLI-072
  test('re-opening the form for an already-applied pet sends the adopter to the existing application', async ({
    browser,
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const session = await openSignedInSession(browser, await createVerifiedAdopter('apply-dup'));
    const { page } = session;
    try {
      const { applicationId, petId } = await createAdopterApplication(session.api, rescueApi);
      await dismissCookieBannerPatiently(page);

      await page.goto(`/apply/${petId}`);
      await expect(page).toHaveURL(new RegExp(`/applications/${applicationId}$`), {
        timeout: 20_000,
      });
      await expect(
        page.getByRole('heading', { level: 1, name: 'Application Details' })
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: /let.s get you adopting/i })).toHaveCount(0);
      expect(await listApplications(session.api, petId)).toHaveLength(1);
    } finally {
      await session.close();
    }
  });

  // CLI-072. KNOWN APP BUG: the redirect carries a "You already have an active
  // application for this pet." message in router state that no page renders, so
  // the adopter is moved to another page with no explanation. Remove test.fail
  // when the message is shown.
  test('the adopter is told why they were redirected to the existing application', async ({
    browser,
    apiAs,
  }) => {
    test.fail(true, 'ApplicationDetailsPage never renders location.state.message');
    const rescueApi = await apiAs('rescue');
    const session = await openSignedInSession(browser, await createVerifiedAdopter('apply-msg'));
    const { page } = session;
    try {
      const { petId } = await createAdopterApplication(session.api, rescueApi);
      await dismissCookieBannerPatiently(page);
      await page.goto(`/apply/${petId}`);
      await expect(page).toHaveURL(/\/applications\/[0-9a-f-]{36}$/, { timeout: 20_000 });
      await expect(page.getByText(/already have an active application/i)).toBeVisible({
        timeout: 5_000,
      });
    } finally {
      await session.close();
    }
  });

  // CLI-073 + CLI-074
  test('My Applications lists every application with pet, date and status, and each opens its details', async ({
    browser,
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const session = await openSignedInSession(browser, await createVerifiedAdopter('apply-list'));
    const { page } = session;
    try {
      const waiting = await createAdopterApplication(session.api, rescueApi);
      const approved = await createAdopterApplication(session.api, rescueApi);
      const rejected = await createAdopterApplication(session.api, rescueApi);
      await decide(rescueApi, approved.applicationId, 'approved');
      await decide(rescueApi, rejected.applicationId, 'rejected');

      await dismissCookieBannerPatiently(page);
      await page.goto('/applications');
      const expected = [
        { app: waiting, label: 'Submitted' },
        { app: approved, label: 'Approved' },
        { app: rejected, label: 'Rejected' },
      ];
      for (const { app, label } of expected) {
        const card = applicationCard(page, await petNameOf(rescueApi, app.petId));
        await expect(card).toBeVisible({ timeout: 20_000 });
        await expect(card.getByText(label, { exact: true })).toBeVisible();
        await expect(card.getByText(DISPLAY_DATE).first()).toBeVisible();
      }
      await expect(page.getByRole('button', { name: 'View Details' })).toHaveCount(3);

      // CLI-074: the approved application's details page.
      await applicationCard(page, await petNameOf(rescueApi, approved.petId))
        .getByRole('button', { name: 'View Details' })
        .click();
      await expect(page).toHaveURL(new RegExp(`/applications/${approved.applicationId}$`));
      await expect(
        page.getByRole('heading', { level: 1, name: 'Application Details' })
      ).toBeVisible();
      await expect(
        page.getByText(`Application #${approved.applicationId.slice(-6)}`)
      ).toBeVisible();
      await expect(page.getByText('Status', { exact: true }).locator('..')).toContainText(
        'Approved'
      );
      await expect(page.getByText('Submitted', { exact: true }).locator('..')).toContainText(
        DISPLAY_DATE
      );
      await expect(page.getByText('Reviewed', { exact: true }).locator('..')).toContainText(
        DISPLAY_DATE
      );
      await expect(page.getByText(approved.applicationId, { exact: true })).toBeVisible();
      await expect(page.getByText(approved.petId, { exact: true })).toBeVisible();
      // A decided application can no longer be withdrawn.
      await expect(page.getByRole('button', { name: 'Withdraw Application' })).toHaveCount(0);

      // The still-waiting one can.
      await page.goto(`/applications/${waiting.applicationId}`);
      await expect(page.getByRole('button', { name: 'Withdraw Application' })).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await session.close();
    }
  });

  // CLI-076
  test('a rescue decision shows on My Applications and arrives as a notification', async ({
    browser,
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const session = await openSignedInSession(browser, await createVerifiedAdopter('apply-decide'));
    const { page } = session;
    try {
      const { applicationId, petId } = await createAdopterApplication(session.api, rescueApi);
      const petName = await petNameOf(rescueApi, petId);

      await dismissCookieBannerPatiently(page);
      await page.goto('/applications');
      const card = applicationCard(page, petName);
      await expect(card.getByText('Submitted', { exact: true })).toBeVisible({ timeout: 20_000 });

      await decide(rescueApi, applicationId, 'approved');

      await page.reload();
      await expect(card.getByText('Approved', { exact: true })).toBeVisible({ timeout: 20_000 });
      await expect(card.getByText('Submitted', { exact: true })).toHaveCount(0);

      await page.goto('/notifications');
      await expect(page.getByText('Application approved!')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/your application has been approved/i)).toBeVisible();
    } finally {
      await session.close();
    }
  });
});
