import { test, expect } from '../../fixtures';
import { uniquePetName } from '../../helpers/factories';

test.describe('rescue pet listing management', () => {
  test('a rescue manager can create a new pet listing', async ({ page }) => {
    const petName = uniquePetName('Bella');

    await page.goto('/pets');
    await page
      .getByRole('button', { name: /(add|new|create) (pet|listing)/i })
      .first()
      .click();

    await page
      .getByLabel(/^name|pet name/i)
      .first()
      .fill(petName);
    const speciesField = page.getByLabel(/species|type/i).first();
    if (await speciesField.count()) {
      await speciesField.click();
      const dogOption = page.getByRole('option', { name: /dog/i }).first();
      if (await dogOption.count()) {
        await dogOption.click();
      } else {
        await speciesField.fill('Dog');
      }
    }
    const breedField = page.getByLabel(/breed/i).first();
    if (await breedField.count()) {
      await breedField.fill('Mixed');
    }
    const ageField = page.getByLabel(/age/i).first();
    if (await ageField.count()) {
      await ageField.fill('3');
    }
    const descField = page.getByLabel(/description|bio/i).first();
    if (await descField.count()) {
      await descField.fill('A friendly, playful dog looking for a forever home (e2e fixture).');
    }

    await page
      .getByRole('button', { name: /(save|create|publish)/i })
      .first()
      .click();

    await expect(page.getByText(petName).first()).toBeVisible({ timeout: 15_000 });
  });
});
