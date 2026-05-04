import { test, expect } from '../../fixtures';
import { openFirstPet } from '../../helpers/pet';

/**
 * The seeded `john.smith@gmail.com` adopter is verified, so this spec
 * confirms a verified adopter is NOT blocked from the application flow —
 * the converse of the gating behaviour. A separate negative case using a
 * freshly-registered (unverified) account is covered by
 * registration-and-login.spec.ts which exercises the post-register state.
 */
test.describe('email verification gating', () => {
  test('a verified adopter can begin an application', async ({ page }) => {
    await openFirstPet(page);

    await page
      .getByRole('button', { name: /apply (to|for) adopt/i })
      .first()
      .click();

    await expect(page).toHaveURL(/\/apply\/|\/applications\/new/, { timeout: 15_000 });
    // Negative assertion: no verify-email gating message.
    await expect(page.getByText(/please verify (your )?email/i)).toHaveCount(0);
  });
});
