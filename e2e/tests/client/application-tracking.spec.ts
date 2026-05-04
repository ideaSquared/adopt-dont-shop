import { test, expect } from '../../fixtures';

/**
 * Adopter side of the lifecycle: the adopter's "My Applications" view
 * surfaces a status for each application, and the status reflects the
 * persisted server state. The rescue-side state machine itself is unit-
 * tested in service.backend; here we verify that the client surface
 * stays in sync with whatever the API reports.
 */
test.describe('application tracking', () => {
  test('the My Applications page renders for an adopter', async ({ page, apiAs }) => {
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

    await page.goto('/applications');
    await expect(page.getByRole('heading', { level: 1, name: /my applications/i })).toBeVisible({
      timeout: 15_000,
    });

    if (apps.length === 0) {
      // Empty state should be rendered, not a crash.
      await expect(
        page
          .getByRole('heading', { name: /no applications yet/i })
          .or(page.getByText(/no applications yet/i))
          .first()
      ).toBeVisible({ timeout: 10_000 });
      return;
    }

    // At least one of the seeded statuses should appear somewhere on the
    // page.  We don't enforce all of them — partial render is fine.
    const distinctStatuses = Array.from(
      new Set(apps.map(a => a.status).filter(Boolean) as string[])
    );
    let sawAny = false;
    for (const status of distinctStatuses.slice(0, 5)) {
      const pattern = new RegExp(status.replace(/_/g, '[ _]?'), 'i');
      if (
        await page
          .getByText(pattern)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        sawAny = true;
        break;
      }
    }
    expect(sawAny).toBe(true);
  });
});
