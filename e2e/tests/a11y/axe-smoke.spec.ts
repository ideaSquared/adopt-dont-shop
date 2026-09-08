import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { findAvailablePetId } from '../../helpers/pet';

/**
 * ADS-1326: axe-core smoke gate for app.client.
 *
 * Runs on the `a11y` Playwright project (see playwright.config.ts), which is
 * logged out by default — the right state for the public home page and the
 * login page, and adequate for a pet detail page (detail pages are public).
 *
 * Allowed rule exclusions (documented, not blanket-disabled):
 *
 * - `label`: axe's form-label rule. `docs/ACCESSIBILITY.md` already tracks
 *   188 `jsx-a11y/label-has-for` + 128 `jsx-a11y/control-has-associated-label`
 *   lint warnings across the codebase — real, known gaps in label
 *   association that need a dedicated pass through the shared form
 *   primitives (see the "next ratchet step" note there), not a silent skip
 *   here. Excluding it keeps this smoke spec green as a *regression* gate
 *   (new pages don't get new axe violations) while that dedicated pass is
 *   still pending; remove this exclusion once that pass lands.
 */
const ALLOWED_RULE_EXCLUSIONS = ['label'];

async function assertNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(ALLOWED_RULE_EXCLUSIONS)
    .analyze();

  const summary = results.violations.map(v => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    targets: v.nodes.map(n => n.target),
  }));

  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
}

test.describe('axe accessibility smoke @smoke', () => {
  test('the client home page has no axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
    await assertNoAxeViolations(page);
  });

  test('a pet detail page has no axe violations', async ({ page }) => {
    const petId = await findAvailablePetId();
    test.skip(!petId, 'no available pets in the seed set');
    await page.goto(`/pets/${petId}`);
    await expect(page).toHaveURL(/\/pets\//, { timeout: 15_000 });
    await assertNoAxeViolations(page);
  });

  test('the login page has no axe violations', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    await assertNoAxeViolations(page);
  });
});
