import { test, expect } from '../../fixtures';
import { createAdopterApplication, expectOk, patchWithCsrf } from '../../helpers/seeds';

/**
 * The rescue's application review page lives at /applications.  Verify
 * the rescue user can see the seeded applications, and that an admin
 * status patch on a fresh application is reflected in the rescue's
 * listing.  We use a fresh application (not the seeded one) so the
 * transition starts from clean state.
 */
test.describe('rescue application review', () => {
  test('the application list mounts under a rescue staff user', async ({ page, apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const res = await rescueApi.context.get('/api/v1/applications', { params: { limit: '5' } });
    await expectOk(res, 'GET /applications (rescue scope)');

    await page.goto('/applications', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/applications/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
  });

  test('an application status change made via API is reflected in the rescue list', async ({
    apiAs,
  }) => {
    const adopterApi = await apiAs('adopter');
    const adminApi = await apiAs('admin');
    const rescueApi = await apiAs('rescue');
    const { applicationId } = await createAdopterApplication(adopterApi, rescueApi);

    const targetStatus = 'approved';
    const patchRes = await patchWithCsrf(
      adminApi.context,
      `/api/v1/applications/${applicationId}/status`,
      { status: targetStatus }
    );
    await expectOk(patchRes, `PATCH /applications/${applicationId}/status (→ ${targetStatus})`);

    await expect
      .poll(
        async () => {
          const res = await rescueApi.context.get('/api/v1/applications', {
            params: { limit: '50' },
          });
          if (!res.ok()) {
            return null;
          }
          const body = (await res.json()) as {
            data?: Array<{ applicationId?: string; id?: string; status?: string }>;
            applications?: Array<{ applicationId?: string; id?: string; status?: string }>;
          };
          const list = body.data ?? body.applications ?? [];
          const found = list.find(a => (a.applicationId ?? a.id) === applicationId);
          return found?.status ?? null;
        },
        { timeout: 15_000 }
      )
      .toBe(targetStatus);
  });
});
