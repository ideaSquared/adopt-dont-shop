import { test, expect } from '../../fixtures';

test.describe('moderation queue', () => {
  test('the moderation page renders queue counts or an empty state', async ({ page }) => {
    await page.goto('/moderation');

    await expect(page).toHaveURL(/\/moderation/);

    const queueShape = page
      .getByRole('tab', { name: /(pending|under review|resolved)/i })
      .or(page.getByText(/(pending|under review|resolved|critical)/i))
      .or(page.getByText(/no (open )?reports/i))
      .first();
    await expect(queueShape).toBeVisible({ timeout: 15_000 });
  });
});
