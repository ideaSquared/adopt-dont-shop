import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';

test.describe('rescue messaging', () => {
  test('a rescue staffer can send a message in an existing thread', async ({ page }) => {
    await page.goto('/communication');
    const firstThread = page
      .getByRole('listitem')
      .or(page.locator('[data-testid="chat-thread"]'))
      .first();
    if (!(await firstThread.count())) {
      test.skip(true, 'rescue has no existing communication threads');
    }
    await firstThread.click();

    const message = uniqueText('rescue-reply');
    const input = page
      .getByRole('textbox', { name: /(message|reply|type)/i })
      .or(page.getByPlaceholder(/type (a )?message/i))
      .first();
    await input.fill(message);
    await input.press('Enter');

    await expect(page.getByText(message).first()).toBeVisible({ timeout: 10_000 });
  });
});
