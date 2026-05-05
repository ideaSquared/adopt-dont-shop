import { test, expect } from '../../fixtures';
import { SEEDED_PET_IDS } from '../../helpers/seeds';

/**
 * Behaviourally: a pet that is not available (adopted, on hold, archived)
 * must NOT expose an enabled "Apply" button on its detail page.  The e2e
 * fixtures seeder guarantees an adopted pet at SEEDED_PET_IDS.adopted.
 */
test.describe('availability gating', () => {
  test('the apply CTA is hidden or disabled for an adopted pet', async ({ page }) => {
    await page.goto(`/pets/${SEEDED_PET_IDS.adopted}`);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });

    const apply = page
      .getByRole('button', { name: /apply (to|for) adopt/i })
      .or(page.getByRole('link', { name: /apply (to|for) adopt/i }))
      .first();
    if (await apply.count()) {
      const isDisabled = await apply.isDisabled().catch(() => false);
      expect(isDisabled).toBe(true);
    }
    // If the apply CTA isn't rendered at all, that's also a valid
    // implementation of the gating rule.
  });
});
