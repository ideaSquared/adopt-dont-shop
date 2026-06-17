import { test, expect } from '../../fixtures';
import { SEEDED_PET_IDS } from '../../helpers/seeds';

/**
 * Behaviourally: a pet that is viewable but NOT available for adoption must
 * not expose an enabled "Apply" CTA. The seeded 'pending' pet (Luna) is the
 * right fixture — PetDetailsPage only renders the Apply CTA when
 * `pet.status === 'available'`, so on a pending pet the CTA is absent (the
 * gate working).
 *
 * Note on the stronger statuses: adopted / not_available / deceased pets are
 * hidden from public callers entirely by the pets service
 * (PUBLIC_HIDDEN_STATUSES), so they 404 to a "Pet Not Found" page — there is
 * no detail page (or Apply CTA) to gate at all. This spec deliberately uses
 * the viewable-but-unavailable case, which is where a gate is actually needed.
 */
test.describe('availability gating', () => {
  test('the apply CTA is absent or disabled for a viewable but unavailable (pending) pet', async ({
    page,
  }) => {
    await page.goto(`/pets/${SEEDED_PET_IDS.pending}`);
    // The pending pet is viewable, so its detail page renders the name as <h1>.
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });

    const apply = page
      .getByRole('button', { name: /apply (to|for) adopt/i })
      .or(page.getByRole('link', { name: /apply (to|for) adopt/i }))
      .first();
    if (await apply.count()) {
      const isDisabled = await apply.isDisabled().catch(() => false);
      expect(isDisabled).toBe(true);
    }
    // If the apply CTA isn't rendered at all (the status gate hides it), that
    // is also a valid implementation of the gating rule.
  });
});
