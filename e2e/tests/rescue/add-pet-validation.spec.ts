import { test, expect } from '../../fixtures';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';

/**
 * RES-022: the Add New Pet form will not save without a name and rejects photos
 * that are not images or are too large, with a message that says why. Nothing is
 * created: every case stops at client-side validation.
 */
const ONE_MEGABYTE = 1024 * 1024;

test.describe('add pet form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pets');
    await dismissCookieBannerWhenShown(page);
    // The lazy page chunk can be slow to arrive on a busy dev stack.
    const addPet = page.getByRole('button', { name: 'Add New Pet' });
    await expect(addPet).toBeVisible({ timeout: 30_000 });
    await addPet.click();
    await expect(page.getByRole('dialog', { name: 'Add New Pet' })).toBeVisible();
  });

  test('a pet cannot be saved until it has a name', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Add New Pet' });
    const save = dialog.getByRole('button', { name: 'Add Pet', exact: true });
    const nameField = dialog.getByRole('textbox', { name: 'Pet Name *' });

    // Empty, and whitespace-only, names cannot be submitted.
    await expect(save).toBeDisabled();
    await nameField.fill('   ');
    await expect(save).toBeDisabled();

    await nameField.fill('Biscuit');
    await expect(save).toBeEnabled();

    await nameField.fill('');
    await expect(save).toBeDisabled();
  });

  test('a photo that is not an image is rejected with a clear message', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Add New Pet' });

    await dialog.getByLabel('Add Pet Photos').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not a picture'),
    });

    await expect(dialog.getByText('notes.txt is not a supported image type.')).toBeVisible();
    await expect(dialog.getByRole('list', { name: 'Attached pet photos' })).toBeHidden();
  });

  test('an oversized photo is rejected with a clear message', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Add New Pet' });

    await dialog.getByLabel('Add Pet Photos').setInputFiles({
      name: 'huge.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(11 * ONE_MEGABYTE),
    });

    await expect(dialog.getByText('huge.png is too large. Maximum size is 10MB.')).toBeVisible();
    await expect(dialog.getByRole('list', { name: 'Attached pet photos' })).toBeHidden();
  });
});
