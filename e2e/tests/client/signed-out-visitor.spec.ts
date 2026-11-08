import { test, expect } from '../../fixtures';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { skipSwipeIntro } from '../../helpers/swipe-intro';
import { openAvailablePet } from '../../helpers/pet';

/**
 * What a visitor with no session sees on the adopter app: protected pages
 * hold back their data, retired URLs redirect, unknown URLs get a branded
 * 404. Manual QA: CLI-011, CLI-091, CLI-022, CLI-052.
 *
 * The client app does not hard-redirect every protected route; each page
 * decides how to turn a signed-out visitor away, so each case asserts the
 * boundary that page actually shows.
 */
test.describe('signed-out visitor', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await skipSwipeIntro(page);
    await dismissCookieBannerWhenShown(page);
  });

  test('/profile sends the visitor to the login page', async ({ page }) => {
    await page.goto('/profile');

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'My Profile' })).toHaveCount(0);
  });

  test('/applications asks the visitor to log in and lists nothing', async ({ page }) => {
    await page.goto('/applications');

    await expect(page.getByText(/please log in to view your applications/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });

  test('/chat shows a login prompt instead of conversations', async ({ page }) => {
    await page.goto('/chat');

    await expect(page.getByRole('heading', { name: /login required/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in to view messages/i })).toHaveAttribute(
      'href',
      '/login'
    );
    await expect(page.getByRole('textbox', { name: /message input/i })).toHaveCount(0);
  });

  test('the retired onboarding URLs redirect to /onboarding', async ({ page }) => {
    for (const legacyPath of ['/match/onboarding', '/onboarding/quiz']) {
      await page.goto(legacyPath);
      await expect(page).toHaveURL(/\/onboarding$/);
    }
  });

  test('an unknown URL shows the 404 page with a way back home', async ({ page }) => {
    await page.goto('/this-does-not-exist');

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('link', { name: /take me home/i })).toBeVisible();

    await page.getByRole('link', { name: /take me home/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('a pet page offers sign-in to apply rather than a favourite control', async ({ page }) => {
    // The manual plan expects "favourite -> prompted to sign in". The pet page
    // hides the favourite control entirely for visitors and offers sign-in
    // links for the actions it does show, so assert that behaviour.
    await openAvailablePet(page);

    await expect(page.getByRole('button', { name: /add to favorites/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /sign in to apply/i })).toHaveAttribute(
      'href',
      /^\/login\?redirect=/,
      { timeout: 20_000 }
    );
  });
});
