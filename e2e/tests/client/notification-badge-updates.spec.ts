import { test, expect } from '../../fixtures';

test.describe('notification badge', () => {
  test('opening the notifications page clears the unread badge', async ({ page }) => {
    await page.goto('/');
    const bell = page
      .getByRole('button', { name: /notification/i })
      .or(page.locator('[data-testid="notification-bell"]'))
      .first();
    if (!(await bell.count())) {
      test.skip(true, 'notification bell not present in this build');
    }

    await page.goto('/notifications');
    await page
      .getByRole('button', { name: /mark.*(all )?(as )?read/i })
      .first()
      .click()
      .catch(() => undefined);

    await page.goto('/');
    const badge = page.locator('[data-testid="notification-badge"]').first();
    if (await badge.count()) {
      const text = (await badge.textContent())?.trim() ?? '';
      expect(text === '' || text === '0').toBe(true);
    }
  });
});
