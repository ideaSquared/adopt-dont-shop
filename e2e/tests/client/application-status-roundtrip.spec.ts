import { test, expect } from '../../fixtures';
import { createAdopterApplication, expectOk, patchWithCsrf } from '../../helpers/seeds';

/**
 * Cross-app: admin advances an application's status via API, and the
 * adopter's My Applications page reflects the new state.  We create a
 * fresh application per test (instead of mutating a seeded one) so the
 * status transition starts from a clean 'submitted' state and doesn't
 * conflict with other tests reading the seeded fixtures.
 */
test.describe('application status round-trip', () => {
  test('a status change made by admin surfaces on the adopter dashboard', async ({
    page,
    apiAs,
  }) => {
    const adopterApi = await apiAs('adopter');
    const rescueApi = await apiAs('rescue');
    const adminApi = await apiAs('admin');
    const { applicationId } = await createAdopterApplication(adopterApi, rescueApi);

    const targetStatus = 'approved';
    const patchRes = await patchWithCsrf(
      adminApi.context,
      `/api/v1/applications/${applicationId}/status`,
      { status: targetStatus }
    );
    await expectOk(patchRes, `PATCH /applications/${applicationId}/status (→ ${targetStatus})`);

    await page.goto('/applications', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('heading', { level: 1, name: /my applications/i })).toBeVisible({
      timeout: 15_000,
    });
    const statusPattern = new RegExp(targetStatus, 'i');
    await expect(page.getByText(statusPattern).first()).toBeVisible({ timeout: 20_000 });
  });
});
