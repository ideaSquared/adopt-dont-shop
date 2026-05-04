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

    // The page may show a toast or just close the edit form; settle for
    // either a confirmation message or the bio text appearing in the
    // summary view.
    const confirmation = page.getByText(/(saved|updated|profile updated)/i).first();
    const summaryBio = page.getByText(newBio).first();
    await expect(confirmation.or(summaryBio)).toBeVisible({ timeout: 15_000 });

    // Round-trip: navigate away and back; the bio should still be present.
    await page.goto('/');
    await page.goto('/profile');
    await expect(page.getByText(newBio).first()).toBeVisible({ timeout: 15_000 });
  });
});
