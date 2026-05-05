import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';

/**
 * The bio field is rendered by ProfileEditForm once the user clicks
 * "Edit Profile".  We assert it exists (no skip) — if it doesn't, that
 * itself is a regression worth surfacing.
 */
test.describe('adopter profile updates', () => {
  test('a profile bio update persists across navigation', async ({ page }) => {
    const newBio = uniqueText('bio');

    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1, name: /my profile/i })).toBeVisible({
      timeout: 15_000,
    });

    // Open the edit form.
    await page
      .getByRole('button', { name: /edit profile/i })
      .first()
      .click();

    const bioField = page.locator('textarea#bio').first();
    await expect(bioField).toBeVisible({ timeout: 15_000 });
    await bioField.fill(newBio);

    await page
      .getByRole('button', { name: /(save|update) (profile|changes)/i })
      .first()
      .click();

    // Settle for any of: success toast, edit-form closed, bio in summary.
    await page.waitForTimeout(3_000);

    // Round-trip: navigate away and back; the bio should still be
    // visible (either in the summary or the edit-form pre-fill).
    await page.goto('/');
    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });

    // Re-open edit form to read the value back.
    const editBtnAfter = page.getByRole('button', { name: /edit profile/i }).first();
    if (await editBtnAfter.count()) {
      await editBtnAfter.click();
      const bioAfter = page.locator('textarea#bio').first();
      await expect(bioAfter).toHaveValue(newBio, { timeout: 15_000 });
    } else {
      // Fall back to scanning the page for the bio text in the summary.
      await expect(page.getByText(newBio).first()).toBeVisible({ timeout: 15_000 });
    }
  });
});
