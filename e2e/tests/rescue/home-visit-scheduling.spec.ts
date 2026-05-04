import { test, expect } from '../../fixtures';

test.describe('home visit scheduling', () => {
  test('a rescue admin can open the events / home visit page without errors', async ({ page }) => {
    await page.goto('/events');

    await expect(page).toHaveURL(/\/events/);

    // The page should render either an existing schedule or a clear empty state.
    const hasContent = page
      .getByRole('table')
      .or(page.getByRole('list'))
      .or(page.locator('[data-testid="events-empty-state"]'))
      .or(page.getByText(/no (home )?visits|no events scheduled/i))
      .first();
    await expect(hasContent).toBeVisible({ timeout: 15_000 });
  });
});
