import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';
import { hardenedClick } from '../../helpers/ui';

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
    const editProfile = page.getByRole('button', { name: /edit profile/i }).first();
    await hardenedClick(editProfile);

    const bioField = page.locator('textarea#bio').first();
    await expect(bioField).toBeVisible({ timeout: 15_000 });
    await bioField.fill(newBio);

    const saveProfile = page
      .getByRole('button', { name: /(save|update) (profile|changes)/i })
      .first();
    await hardenedClick(saveProfile);

    // Wait for the save to actually land rather than a blind timeout: on
    // success the edit form closes and a confirmation appears. Navigating
    // before the PATCH resolves would abort the request and lose the update.
    await expect(page.getByText(/profile updated/i).first()).toBeVisible({ timeout: 15_000 });

    // Round-trip: navigate away and back. The persisted bio is rendered in the
    // profile summary from the freshly rehydrated user — the authoritative
    // "did it persist" signal. (The edit form's textarea pre-fills from the
    // same source, so asserting the summary is equivalent and free of the
    // form's mount-time hydration timing.)
    await page.goto('/');
    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1, name: /my profile/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(newBio).first()).toBeVisible({ timeout: 15_000 });
  });
});
