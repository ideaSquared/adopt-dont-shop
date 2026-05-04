import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';

test.describe('adopter profile updates', () => {
  test('a profile bio update persists across navigation', async ({ page }) => {
    const newBio = uniqueText('bio');

    await page.goto('/profile');
    const bioField = page
      .getByLabel(/bio|about (you|me)/i)
      .or(page.getByPlaceholder(/tell us about/i))
      .first();
    await bioField.fill(newBio);

    await page
      .getByRole('button', { name: /(save|update) (profile|changes)/i })
      .first()
      .click();
    await expect(page.getByText(/(saved|updated|profile updated)/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Round-trip: navigate away and back; the bio should still be present.
    await page.goto('/');
    await page.goto('/profile');
    await expect(bioField).toHaveValue(newBio);
  });
});
