import { test, expect } from '../../fixtures';
import { createAdopterApplication, expectOk, patchWithCsrf } from '../../helpers/seeds';

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
    // A fresh application is at the top of the list however many others the shared stack holds.
    const { applicationId } = await createAdopterApplication(adopterApi, rescueApi);

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

  test('rescue staff can see who applied', async ({ page }) => {
    // The seeded John Smith application belongs to Paws Rescue. Before the
    // scoped GetApplicantProfile lookup, staff could not read the applicant's
    // account and every row read "Unknown / No email provided".
    await page.goto('/applications', { waitUntil: 'domcontentloaded', timeout: 60_000 });

    const main = page.getByRole('main');
    await expect(main.getByText('John Smith').first()).toBeVisible({ timeout: 30_000 });
    await expect(main.getByText('john.smith@gmail.com').first()).toBeVisible();
  });

  test("an admin status patch is reflected in the rescue's listing", async ({ apiAs }) => {
    const adopterApi = await apiAs('adopter');
    const adminApi = await apiAs('admin');
    const rescueApi = await apiAs('rescue');
    // A fresh application, so the seeded one other specs read is left alone.
    const { applicationId } = await createAdopterApplication(adopterApi, rescueApi);

    // Approving needs a started review; rejecting a submitted application does not.
    const patchRes = await patchWithCsrf(
      adminApi.context,
      `/api/v1/applications/${applicationId}/status`,
      { status: 'rejected', notes: 'Not a good match for this pet' }
    );
    await expectOk(patchRes, `PATCH /applications/${applicationId}/status`);

    const detailRes = await adopterApi.context.get(`/api/v1/applications/${applicationId}`);
    await expectOk(detailRes, `GET /applications/${applicationId}`);
    const detail = (await detailRes.json()) as { data: { status: string } };
    expect(detail.data.status).toBe('rejected');

    await expect
      .poll(
        async () => {
          const res = await rescueApi.context.get('/api/v1/applications', {
            params: { limit: '50' },
          });
          const body = (await res.json()) as {
            data: Array<{ applicationId?: string; id?: string; status?: string }>;
          };
          return body.data.find(a => (a.applicationId ?? a.id) === applicationId)?.status;
        },
        { timeout: 15_000 }
      )
      .toBe('rejected');
  });
});
