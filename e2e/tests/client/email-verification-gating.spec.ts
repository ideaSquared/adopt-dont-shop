import { test, expect } from '../../fixtures';
import { seededPetId } from '../../helpers/seeds';

/**
 * The seeded `john.smith@gmail.com` adopter is verified, so this spec
 * confirms a verified adopter is NOT blocked from the application flow.
 */
test.describe('email verification gating', () => {
  test('a verified adopter can begin an application', async ({ page, apiAs }) => {
    // Skip the swipe-onboarding overlay (it intercepts pointer events
    // on the apply CTA on first visit).
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenSwipeOnboarding', 'true');
    });

    const availablePetId = await seededPetId(await apiAs('rescue'), 'available');
    await page.goto(`/pets/${availablePetId}`);
    await expect(page).toHaveURL(/\/pets\//, { timeout: 15_000 });

    const apply = page
      .getByRole('link', { name: /apply (to|for) adopt/i })
      .or(page.getByRole('button', { name: /apply (to|for) adopt/i }))
      .first();
    await expect(apply).toBeVisible({ timeout: 15_000 });
    await apply.click();

    await expect(page).toHaveURL(/\/apply\/|\/applications\/new/, { timeout: 15_000 });
    await expect(page.getByText(/please verify (your )?email/i)).toHaveCount(0);
  });
});
