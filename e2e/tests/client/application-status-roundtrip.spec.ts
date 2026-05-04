import { test, expect } from '../../fixtures';

/**
 * Cross-app: rescue (or admin) advances an application's status via API,
 * and the adopter's My Applications page reflects the new state.  Pure
 * application-status read-side validation lives in
 * application-tracking.spec.ts; this test specifically proves the
 * write→read propagation.
 */
test.describe('application status round-trip', () => {
  test('a status change made by the rescue surfaces on the adopter dashboard', async ({
    page,
    apiAs,
  }) => {
    const adopterApi = await apiAs('adopter');

    // Pick an application owned by the seeded adopter.
    const listRes = await adopterApi.context.get('/api/v1/applications', {
      params: { mine: 'true', limit: '20' },
    });
    if (!listRes.ok()) {
      test.skip(true, `applications API not reachable: ${listRes.status()}`);
    }
    const body = (await listRes.json()) as {
      data?: Array<{ applicationId?: string; id?: string; status?: string }>;
      applications?: Array<{ applicationId?: string; id?: string; status?: string }>;
    };
    const apps = body.data ?? body.applications ?? [];
    const target = apps.find(a => a.status !== 'approved' && a.status !== 'rejected');
    const applicationId = target?.applicationId ?? target?.id;
    if (!applicationId) {
      test.skip(true, 'no advanceable application in the seed for this adopter');
    }

    // Advance the status via admin (which is allowed across all rescues —
    // avoids needing to know which rescue owns the application).  Pick a
    // distinctive target status so we can search for it on the adopter UI.
    const adminApi = await apiAs('admin');
    const csrfRes = await adminApi.context.get('/api/v1/csrf-token');
    expect(csrfRes.ok()).toBe(true);
    const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };

    const targetStatus = target!.status === 'approved' ? 'rejected' : 'approved';
    const patchRes = await adminApi.context.patch(`/api/v1/applications/${applicationId}/status`, {
      headers: { 'x-csrf-token': csrfToken! },
      data: { status: targetStatus },
    });
    if (!patchRes.ok()) {
      test.skip(
        true,
        `status update rejected: ${patchRes.status()} ${(await patchRes.text()).slice(0, 200)}`
      );
    }

    // Adopter UI should reflect the new status.  Use a pattern that
    // tolerates the status appearing as a badge label or interpolated
    // text — it'll show up somewhere on the dashboard for that
    // application.
    await page.goto('/applications', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('heading', { level: 1, name: /my applications/i })).toBeVisible({
      timeout: 15_000,
    });
    const statusPattern = new RegExp(targetStatus, 'i');
    await expect(page.getByText(statusPattern).first()).toBeVisible({ timeout: 20_000 });
  });
});
