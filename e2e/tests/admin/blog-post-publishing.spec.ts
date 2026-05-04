import { test, expect } from '../../fixtures';

test.describe('admin content management', () => {
  test('the content management page renders without errors', async ({ page }) => {
    await page.goto('/content');

    await expect(page).toHaveURL(/\/content/);

    const shape = page
      .getByRole('heading', { name: /(content|blog|articles)/i })
      .or(page.getByRole('button', { name: /(new|create) (post|article)/i }))
      .or(page.getByText(/no (posts|articles)/i))
      .first();
    await expect(shape).toBeVisible({ timeout: 15_000 });
  });
});
