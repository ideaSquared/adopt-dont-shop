import { test, expect } from '../../fixtures';
import { uniqueEmail } from '../../helpers/factories';

test.describe('rescue staff management', () => {
  test('a rescue admin can send a staff invitation', async ({ page }) => {
    const inviteEmail = uniqueEmail('staff-invite');

    await page.goto('/staff');
    await page
      .getByRole('button', { name: /(invite|add) (staff|member)/i })
      .first()
      .click();

    await page.getByLabel(/email/i).first().fill(inviteEmail);
    const roleSelect = page.getByLabel(/role/i).first();
    if (await roleSelect.count()) {
      await roleSelect.click();
      const staffRole = page.getByRole('option', { name: /staff/i }).first();
      if (await staffRole.count()) {
        await staffRole.click();
      }
    }
    await page
      .getByRole('button', { name: /(send|invite)/i })
      .first()
      .click();

    await expect(
      page
        .getByText(/invitation (sent|created)|invite sent/i)
        .or(page.getByText(inviteEmail))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
