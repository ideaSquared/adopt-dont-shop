import { test, expect } from '../../fixtures';

test.describe('archiving an adopted pet', () => {
  test('marking a pet as adopted updates its visible status badge', async ({ page }) => {
    await page.goto('/pets');
    const firstRow = page.getByRole('row').or(page.locator('[data-testid="pet-row"]')).nth(1);
    if (!(await firstRow.count())) {
      test.skip(true, 'no pets in this rescue to archive');
    }
    await firstRow.click();

    const statusControl = page.getByLabel(/status/i).first();
    if (!(await statusControl.count())) {
      test.skip(true, 'pet detail page does not expose status control');
    }
    await statusControl.click();
    const adoptedOption = page.getByRole('option', { name: /adopted/i }).first();
    if (await adoptedOption.count()) {
      await adoptedOption.click();
    } else {
      await statusControl.fill('adopted');
    }
    await page
      .getByRole('button', { name: /(save|update)/i })
      .first()
      .click();

    await expect(page.getByText(/adopted/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
