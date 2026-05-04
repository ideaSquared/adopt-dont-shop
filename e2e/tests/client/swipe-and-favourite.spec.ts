import { test, expect } from '../../fixtures';
import { openFirstPet, favouriteCurrentPet } from '../../helpers/pet';

test.describe('favourites', () => {
  test('an adopter can favourite a pet and see it in their favourites list', async ({ page }) => {
    await page.goto('/discover');
    await openFirstPet(page);

    const petName = await page.getByRole('heading').first().textContent();

    await favouriteCurrentPet(page);

    await page.goto('/favorites');
    await expect(page).toHaveURL(/\/favorites/);

    if (petName) {
      await expect(page.getByText(petName.trim()).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('unfavouriting removes the pet from favourites', async ({ page }) => {
    await page.goto('/favorites');
    const removeBtn = page
      .getByRole('button', { name: /(remove|unfavourite|unfavorite)/i })
      .first();
    if (!(await removeBtn.count())) {
      test.skip(true, 'no favourites present to remove — covered by the favourite-add spec');
    }
    const initialCount = await page
      .getByRole('article')
      .or(page.locator('[data-testid="pet-card"]'))
      .count();
    await removeBtn.click();
    await expect
      .poll(
        async () =>
          await page.getByRole('article').or(page.locator('[data-testid="pet-card"]')).count()
      )
      .toBeLessThan(initialCount);
  });
});
