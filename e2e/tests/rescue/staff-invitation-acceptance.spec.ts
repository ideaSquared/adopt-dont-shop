import { test, expect } from '../../fixtures';

/**
 * Anonymous-context spec: confirms the accept-invitation page loads and
 * rejects an obviously bogus token. The full happy-path acceptance flow
 * (issue invite via UI on rescue side, capture token via API, accept on
 * a fresh context) is gated on having an exposed test endpoint to read
 * the invitation token, so we only assert the visible failure mode here.
 */
test.describe('staff invitation acceptance', () => {
  test('an obviously invalid token shows an "expired" message', async ({ page }) => {
    await page.goto('/accept-invitation?token=this-token-does-not-exist-e2e');

    await expect(
      page.getByText(/(invalid|expired|not found).*(invitation|token|link)/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
