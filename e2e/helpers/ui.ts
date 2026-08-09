import { expect, type Locator } from '@playwright/test';

/**
 * Best-effort hardening for the client journeys that flake in CI under a
 * cold/degraded stack. These specs pass against a warm stack but intermittently
 * time out on `locator.click` in CI when the Vite dev server is still compiling
 * the route (first hit) or the stack is under load — the click's default
 * actionability window (config `actionTimeout`, 10s) expires before the target
 * settles. `hardenedClick` widens that window for the specific interaction and
 * scrolls the target into view first.
 *
 * It also defensively dismisses the swipe-onboarding overlay: a fixed,
 * pointer-intercepting modal that is normally suppressed by the seeded
 * `hasSeenSwipeOnboarding` flag, but which would block clicks if a timing edge
 * ever surfaced it. When it isn't present these calls are no-ops.
 */

const CLICK_TIMEOUT_MS = 30_000;

export async function dismissSwipeOnboarding(target: Locator): Promise<void> {
  // "Maybe Later" is unique to the onboarding overlay (SwipeOnboarding's
  // secondary button), so this can't accidentally close another surface.
  const maybeLater = target
    .page()
    .getByRole('button', { name: /^maybe later$/i })
    .first();
  if (await maybeLater.isVisible().catch(() => false)) {
    await maybeLater.click().catch(() => undefined);
    await expect(maybeLater)
      .toBeHidden({ timeout: 5_000 })
      .catch(() => undefined);
  }
}

export async function hardenedClick(target: Locator): Promise<void> {
  await dismissSwipeOnboarding(target);
  await target.scrollIntoViewIfNeeded().catch(() => undefined);
  await target.click({ timeout: CLICK_TIMEOUT_MS });
}
