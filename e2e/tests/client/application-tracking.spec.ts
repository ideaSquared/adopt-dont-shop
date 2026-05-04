import { test, expect } from '../../fixtures';

/**
 * Adopter side of the lifecycle: the adopter's "My Applications" view
 * surfaces a status for each application, and the status reflects the
 * persisted server state. The rescue-side state machine itself is unit-
 * tested in service.backend; here we verify that the client surface
 * stays in sync with whatever the API reports.
 */
test.describe('application tracking', () => {
  test("the My Applications page shows each application's status", async ({ page, apiAs }) => {
    const api = await apiAs('adopter');
    const response = await api.context.get('/api/v1/applications', {
      params: { mine: 'true', limit: '20' },
    });
    if (!response.ok()) {
      test.skip(true, `applications API not reachable (status=${response.status()})`);
    }
    const body = (await response.json()) as {
      data?: Array<{ status?: string }>;
      applications?: Array<{ status?: string }>;
    };
    const apps = body.data ?? body.applications ?? [];
    if (apps.length === 0) {
      test.skip(true, 'no applications for the seeded adopter');
    }

    await page.goto('/applications');

    const distinctStatuses = Array.from(
      new Set(apps.map(a => a.status).filter(Boolean) as string[])
    );
    for (const status of distinctStatuses.slice(0, 3)) {
      await expect(
        page.getByText(new RegExp(status.replace(/_/g, '[ _]?'), 'i')).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});
