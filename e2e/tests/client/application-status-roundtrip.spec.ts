import { test, expect } from '../../fixtures';
import { expectOk, getFirstAdopterApplication, patchWithCsrf } from '../../helpers/seeds';

/**
 * Cross-app: admin advances an application's status via API, and the
 * adopter's My Applications page reflects the new state.  Uses the
 * seeded application; flips it to a distinctive status so the assertion
 * is unambiguous.
 *
 * The Application model has a `canTransitionTo` guard, so we pick a
 * target the seed status can legally move to (submitted → approved is
 * always valid).
 */
test.describe('application status round-trip', () => {
  test('a status change made by admin surfaces on the adopter dashboard', async ({
    page,
    apiAs,
  }) => {
    const adopterApi = await apiAs('adopter');
    const adminApi = await apiAs('admin');
    const { applicationId, status: currentStatus } = await getFirstAdopterApplication(adopterApi);

    // Pick a target the current status can legally transition into.
    // Approved and rejected are reachable from submitted; if we're
    // already at one of those, flip to the other.
    const targetStatus =
      currentStatus === 'approved'
        ? 'rejected'
        : currentStatus === 'rejected'
          ? 'approved'
          : 'approved';

    const patchRes = await patchWithCsrf(
      adminApi.context,
      `/api/v1/applications/${applicationId}/status`,
      { status: targetStatus }
    );
    await expectOk(
      patchRes,
      `PATCH /applications/${applicationId}/status (${currentStatus} → ${targetStatus})`
    );

    await page.goto('/applications', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('heading', { level: 1, name: /my applications/i })).toBeVisible({
      timeout: 15_000,
    });
    const statusPattern = new RegExp(targetStatus, 'i');
    await expect(page.getByText(statusPattern).first()).toBeVisible({ timeout: 20_000 });
  });
});
