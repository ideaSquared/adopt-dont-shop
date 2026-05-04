import { test, expect } from '../../fixtures';
import { getFirstAdopterApplication } from '../../helpers/seeds';

/**
 * Adopter side of the lifecycle: the adopter's "My Applications" view
 * surfaces a status for each application.  John Smith's seeded
 * applications guarantee at least one row to assert against.
 */
test.describe('application tracking', () => {
  test("the My Applications page shows the adopter's applications with statuses", async ({
    page,
    apiAs,
  }) => {
    const adopterApi = await apiAs('adopter');
    const { status } = await getFirstAdopterApplication(adopterApi);

    await page.goto('/applications');
    await expect(page.getByRole('heading', { level: 1, name: /my applications/i })).toBeVisible({
      timeout: 15_000,
    });

    // The status name shows up on the page somewhere — as a badge, in
    // the timeline copy, or interpolated text.  Tolerate underscore vs
    // space variations (under_review / Under Review).
    const pattern = new RegExp(status.replace(/_/g, '[ _]?'), 'i');
    await expect(page.getByText(pattern).first()).toBeVisible({ timeout: 15_000 });
  });
});
