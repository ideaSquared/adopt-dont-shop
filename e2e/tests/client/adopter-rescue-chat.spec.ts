import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';

test.describe('chat between adopter and rescue', () => {
  test('a message sent by the adopter shows up in the rescue staff inbox', async ({
    page,
    asRole,
  }) => {
    const message = uniqueText('hello');

    await page.goto('/chat');
    const firstThread = page
      .getByRole('listitem')
      .or(page.locator('[data-testid="chat-thread-list"] [role="button"]'))
      .first();
    if (!(await firstThread.count())) {
      test.skip(true, 'no existing chat threads for the seeded adopter');
    }
    await firstThread.click();

    const input = page
      .getByRole('textbox', { name: /(message|reply|type)/i })
      .or(page.getByPlaceholder(/type (a )?message/i))
      .first();
    await input.fill(message);
    await input.press('Enter');

    await expect(page.getByText(message).first()).toBeVisible({ timeout: 10_000 });

    const rescuePage = await asRole('rescue');
    await rescuePage.goto('/communication');

    await expect(rescuePage.getByText(message).first()).toBeVisible({ timeout: 30_000 });
  });
});
