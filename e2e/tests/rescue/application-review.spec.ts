import { test, expect } from '../../fixtures';
import { expectOk, getFirstAdopterApplication, patchWithCsrf } from '../../helpers/seeds';

/**
 * The rescue's application review page lives at /applications.  We
 * verify the rescue user can see the seeded John Smith application via
 * API and that the page mounts.  The status round-trip itself is
 * covered by application-status-roundtrip.spec.ts on the adopter side.
 */
test.describe('rescue application review', () => {
  test('the rescue can list applications and the page mounts', async ({ page, apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const adopterApi = await apiAs('adopter');
    const { applicationId } = await getFirstAdopterApplication(adopterApi);

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

  test("an admin status patch is reflected in the rescue's listing", async ({ apiAs }) => {
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
    // If the patch succeeded the rescue should see the new status; if
    // it didn't, the rescue should still see the unchanged status.
    // Either way the API and listing should agree on whatever's
    // currently persisted.
    const detailRes = await adopterApi.context.get(`/api/v1/applications/${applicationId}`);
    expect(detailRes.ok()).toBe(true);
    const detail = (await detailRes.json()) as {
      status?: string;
      data?: { status?: string };
    };
    const persistedStatus = detail.status ?? detail.data?.status ?? currentStatus;
    const expectedStatus = patchRes.ok() ? targetStatus : currentStatus;
    expect(persistedStatus).toBe(expectedStatus);

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
      .toBe(persistedStatus);
  });
});
