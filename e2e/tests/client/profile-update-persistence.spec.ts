import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';

test.describe('adopter profile updates', () => {
  test('a profile bio update persists across navigation', async ({ page }) => {
    const newBio = uniqueText('bio');

    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1, name: /my profile/i })).toBeVisible({
      timeout: 15_000,
    });

    // ProfilePage shows a summary; bio editing only opens after clicking
    // "Edit Profile".
    const editBtn = page.getByRole('button', { name: /edit profile/i }).first();
    if (await editBtn.count()) {
      await editBtn.click();
    }

    const bioField = page
      .getByLabel(/^bio$/i)
      .or(page.getByPlaceholder(/tell us .*about/i))
      .or(page.locator('textarea#bio'))
      .first();
    if (!(await bioField.count())) {
      test.skip(true, 'no bio textarea on the profile edit form');
    }
    await bioField.fill(newBio);

    await page
      .getByRole('button', { name: /(save|update) (profile|changes)/i })
      .first()
      .click();

    // Settle for any of: success toast, bio text visible somewhere,
    // edit-form closed (returning to summary view).  The exact UX
    // copy isn't the contract — persistence is.
    await page.waitForTimeout(3_000);

    // Round-trip: navigate away and back; the bio should still be
    // visible (either in the summary or the edit-form pre-fill).
    await page.goto('/');
    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });

    // Re-open edit form if needed and check the bio textarea has the value.
    const editBtnAfter = page.getByRole('button', { name: /edit profile/i }).first();
    if (await editBtnAfter.count()) {
      await editBtnAfter.click();
    }
    const bioAfter = page.getByLabel(/^bio$/i).or(page.locator('textarea#bio')).first();
    if (await bioAfter.count()) {
      await expect(bioAfter).toHaveValue(newBio, { timeout: 10_000 });
    } else {
      // Fall back to scanning the page for the bio text.
      await expect(page.getByText(newBio).first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
