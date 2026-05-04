import { test, expect } from '../../fixtures';

test.describe('rescue pet listing management', () => {
  test('a rescue manager can open the pet management page', async ({ page }) => {
    await page.goto('/pets');
    await expect(page).toHaveURL(/\/pets/);

    // The page heading is "Pet Management" once the rescue is configured,
    // or "Rescue Setup Required" before that.  Either is a valid landed
    // state — both prove the page mounted.
    await expect(
      page
        .getByRole('heading', { level: 1, name: /(pet management|rescue setup required)/i })
        .first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
