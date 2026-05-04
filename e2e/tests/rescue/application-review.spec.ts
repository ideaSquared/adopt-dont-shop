import { test, expect } from '../../fixtures';
import { expectOk, getFirstAdopterApplication, patchWithCsrf } from '../../helpers/seeds';

/**
 * The rescue's application review page lives at /applications.  We use
 * the seeded John Smith application and verify the rescue user can see
 * it, plus that an admin status patch is reflected on the rescue list.
 */
test.describe('rescue application review', () => {
  test('the application list includes the seeded application', async ({ page, apiAs }) => {
    const adopterApi = await apiAs('adopter');
    const { applicationId } = await getFirstAdopterApplication(adopterApi);

    const rescueApi = await apiAs('rescue');
    const res = await rescueApi.context.get('/api/v1/applications', { params: { limit: '50' } });
    await expectOk(res, 'GET /applications (rescue scope)');
    const body = (await res.json()) as {
      data?: Array<{ applicationId?: string; id?: string }>;
      applications?: Array<{ applicationId?: string; id?: string }>;
    };
    const list = body.data ?? body.applications ?? [];
    expect(list.some(a => (a.applicationId ?? a.id) === applicationId)).toBe(true);

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
    const { applicationId, status: currentStatus } = await getFirstAdopterApplication(adopterApi);

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
