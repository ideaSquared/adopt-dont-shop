import { test, expect } from '../../fixtures';
import { findAvailablePetId } from '../../helpers/pet';

/**
 * The seeded `john.smith@gmail.com` adopter is verified, so this spec
 * confirms a verified adopter is NOT blocked from the application flow —
 * the converse of the gating behaviour. A separate negative case using a
 * freshly-registered (unverified) account is covered by
 * registration-and-login.spec.ts which exercises the post-register state.
 */
test.describe('email verification gating', () => {
  test('a verified adopter can begin an application', async ({ page }) => {
    const id = await findAvailablePetId();
    if (!id) {
      test.skip(true, 'no available pets in the seed set');
    }
    await page.goto(`/pets/${id}`);
    await expect(page).toHaveURL(/\/pets\//, { timeout: 15_000 });

    // PetDetailsPage renders <Link to="/apply/...">Apply to Adopt</Link> —
    // an anchor, not a button.  Match either to stay forgiving.
    const apply = page
      .getByRole('link', { name: /apply (to|for) adopt/i })
      .or(page.getByRole('button', { name: /apply (to|for) adopt/i }))
      .first();
    await expect(apply).toBeVisible({ timeout: 15_000 });
    await apply.click();

    await expect(page).toHaveURL(/\/apply\/|\/applications\/new/, { timeout: 15_000 });
    // Negative assertion: no verify-email gating message.
    await expect(page.getByText(/please verify (your )?email/i)).toHaveCount(0);
  });
});
