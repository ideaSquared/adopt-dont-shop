import { test, expect } from '../../fixtures';
import { SEEDED_PET_IDS } from '../../helpers/seeds';

/**
 * High-level happy path: from a pet detail page, the apply CTA leads to
 * /apply/:petId.  The actual submission flow depends on rescue-defined
 * custom questions, so we verify the *navigation* into the application
 * funnel rather than driving every per-rescue field — those details are
 * covered by lower-level component tests.
 */
test.describe('adoption application submission', () => {
  test('the apply CTA on a pet detail page lands the adopter on the application form', async ({
    page,
  }) => {
    await page.goto(`/pets/${SEEDED_PET_IDS.available}`);
    await expect(page).toHaveURL(/\/pets\//, { timeout: 15_000 });

    // PetDetailsPage renders the apply CTA as <Link>, not <button>.
    const apply = page
      .getByRole('link', { name: /apply (to|for) adopt/i })
      .or(page.getByRole('button', { name: /apply (to|for) adopt/i }))
      .first();
    await expect(apply).toBeVisible({ timeout: 15_000 });
    await apply.click();

    await expect(page).toHaveURL(/\/apply\//, { timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
  });
});
