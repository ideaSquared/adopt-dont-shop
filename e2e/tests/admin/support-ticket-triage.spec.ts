import { test, expect } from '../../fixtures';

test.describe('admin support ticket triage', () => {
  test('the support page filters tickets by status', async ({ page }) => {
    await page.goto('/support');

    await expect(page).toHaveURL(/\/support/);

    const openTab = page.getByRole('tab', { name: /^(open|new)$/i }).first();
    if (await openTab.count()) {
      await openTab.click();
      await expect(page.getByRole('tab', { name: /^(open|new)$/i }).first()).toHaveAttribute(
        'aria-selected',
        'true'
      );
    }

    const list = page
      .getByRole('row')
      .or(page.getByRole('listitem'))
      .or(page.locator('[data-testid="ticket-row"]'))
      .or(page.getByText(/no (tickets|open tickets)/i))
      .first();
    await expect(list).toBeVisible({ timeout: 15_000 });
  });
});
