import { test, expect } from '../../fixtures';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import {
  createAdopterApplication,
  expectOk,
  patchWithCsrf,
  postWithCsrf,
} from '../../helpers/seeds';
import { openSignedInSession } from '../../helpers/signed-in-session';

/**
 * Cross-role: an admin moves an application through review to approved, and the
 * adopter's My Applications page and the application API both show Approved.
 *
 * Every step must succeed (a rejected PATCH fails the test) and the asserted
 * status is the one we asked for, not "whatever is persisted". A fresh adopter
 * and application keep the seeded John Smith application untouched for the
 * specs that read it.
 */
test.describe('application status round-trip', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("an admin's approval is reflected on the adopter's dashboard", async ({
    browser,
    apiAs,
  }) => {
    const adminApi = await apiAs('admin');
    const rescueApi = await apiAs('rescue');
    const session = await openSignedInSession(browser, await createVerifiedAdopter('roundtrip'));
    const { page, api: adopterApi } = session;
    try {
      const { applicationId, petId } = await createAdopterApplication(adopterApi, rescueApi);
      const petRes = await adminApi.context.get(`/api/v1/pets/${petId}`);
      await expectOk(petRes, 'read pet');
      const petBody = (await petRes.json()) as { data?: { name?: string }; name?: string };
      const petName = petBody.data?.name ?? petBody.name ?? '';
      expect(petName).not.toBe('');

      const before = await adopterApi.context.get(`/api/v1/applications/${applicationId}`);
      await expectOk(before, 'read application');
      expect(((await before.json()) as { data: { status: string } }).data.status).toBe('submitted');

      const review = await postWithCsrf(
        adminApi.context,
        `/api/v1/applications/${applicationId}/review`,
        {}
      );
      await expectOk(review, 'admin starts the review');
      const approve = await patchWithCsrf(
        adminApi.context,
        `/api/v1/applications/${applicationId}/status`,
        { status: 'approved' }
      );
      await expectOk(approve, 'admin approves');

      const after = await adopterApi.context.get(`/api/v1/applications/${applicationId}`);
      await expectOk(after, 'read application again');
      expect(((await after.json()) as { data: { status: string } }).data.status).toBe('approved');

      await dismissCookieBannerPatiently(page);
      await page.goto('/applications');
      await expect(page.getByRole('heading', { level: 1, name: /my applications/i })).toBeVisible({
        timeout: 20_000,
      });
      const card = page
        .locator('main div')
        .filter({ has: page.getByRole('heading', { level: 3, name: petName }) })
        .filter({ has: page.getByRole('button', { name: 'View Details' }) })
        .last();
      await expect(card.getByText('Approved', { exact: true })).toBeVisible({ timeout: 20_000 });
      await expect(card.getByText('Submitted', { exact: true })).toHaveCount(0);
    } finally {
      await session.close();
    }
  });
});
