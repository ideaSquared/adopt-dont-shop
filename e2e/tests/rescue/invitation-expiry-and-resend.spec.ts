import { test, expect } from '../../fixtures';

test.describe('invitation expiry messaging', () => {
  test('the invitation page does not accept an empty token', async ({ page }) => {
    await page.goto('/accept-invitation');
    await expect(
      page
        .getByText(/(invalid|missing|required).*(invitation|token|link)/i)
        .or(page.getByText(/(no )?invitation token/i))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
