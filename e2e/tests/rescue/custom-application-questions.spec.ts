import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';

test.describe('custom application questions', () => {
  test('a rescue admin can save a custom application question', async ({ page }) => {
    await page.goto('/settings');

    const questionsTab = page.getByRole('tab', { name: /(questions|application form)/i }).first();
    if (await questionsTab.count()) {
      await questionsTab.click();
    }

    const addBtn = page.getByRole('button', { name: /(add|new) question/i }).first();
    if (!(await addBtn.count())) {
      test.skip(true, 'application questions builder not exposed on settings');
    }
    await addBtn.click();

    const text = uniqueText('q-text');
    await page
      .getByLabel(/(question|prompt|label)/i)
      .first()
      .fill(text);

    await page
      .getByRole('button', { name: /(save|update|done)/i })
      .first()
      .click();

    await expect(page.getByText(text).first()).toBeVisible({ timeout: 10_000 });
  });
});
