import type { ElementHandle, Locator, Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { petCardLocator } from '../../helpers/pet';
import { createAvailablePet } from '../../helpers/seeds';
import { openSignedInSession } from '../../helpers/signed-in-session';
import { skipSwipeIntro } from '../../helpers/swipe-intro';

const MAX_TABS = 250;

/** Press Tab until `target` has focus; fails (rather than looping forever) if it never does. */
const tabTo = async (page: Page, target: Locator, label: string): Promise<number> => {
  for (let presses = 1; presses <= MAX_TABS; presses += 1) {
    await page.keyboard.press('Tab');
    const focused = await target
      .first()
      .evaluate(el => el === document.activeElement)
      .catch(() => false);
    if (focused) {
      return presses;
    }
  }
  throw new Error(`Tab never reached ${label} within ${MAX_TABS} presses (keyboard trap?)`);
};

type FocusStyle = {
  outline: string;
  shadow: string;
  border: string;
  background: string;
  color: string;
};

/**
 * Computed style of an element and its two ancestors once CSS transitions have finished:
 * text inputs show their focus ring on a wrapper (:focus-within), not on the <input>.
 */
const styleOf = (handle: ElementHandle<Element>): Promise<FocusStyle[]> =>
  handle.evaluate(async (el): Promise<FocusStyle[]> => {
    const chain = [el, el.parentElement, el.parentElement?.parentElement].filter(
      (node): node is Element => node instanceof Element
    );
    await Promise.all(
      chain.flatMap(node => node.getAnimations().map(a => a.finished.catch(() => undefined)))
    );
    return chain.map(node => {
      const cs = getComputedStyle(node);
      return {
        outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor,
        shadow: cs.boxShadow,
        border: cs.borderColor,
        background: cs.backgroundColor,
        color: cs.color,
      };
    });
  });

test.describe('client keyboard-only use', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await skipSwipeIntro(page);
    await dismissCookieBannerPatiently(page);
  });

  // CLI-140
  test('a keyboard alone can sign in, search and open a pet', async ({ page, apiAs }) => {
    const { name: petName } = await createAvailablePet(await apiAs('rescue'), 'KeyNav');
    const account = await createVerifiedAdopter('keyboard');

    // Sign in without touching the mouse.
    await page.goto('/login');
    await tabTo(page, page.getByLabel(/email/i).first(), 'the email field');
    await page.keyboard.type(account.email);
    await tabTo(page, page.getByLabel(/password/i).first(), 'the password field');
    await page.keyboard.type(account.password);
    await page.keyboard.press('Enter');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
    await expect(page.getByRole('button', { name: /user menu for/i })).toBeVisible({
      timeout: 20_000,
    });

    // The skip link is the first stop after the page's own overlays and moves focus into <main>.
    await page.reload();
    await tabTo(page, page.getByRole('link', { name: /skip to main content/i }), 'the skip link');
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();

    // Header navigation: Tab to Search and open it with Enter.
    await tabTo(page, page.getByRole('link', { name: /^Search/ }), 'the Search nav link');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/search$/);

    // Search box: type a query that matches the pet created above.
    const searchBox = page.getByPlaceholder('Search by name, breed, or description...');
    await tabTo(page, searchBox, 'the search box');
    await page.keyboard.type(petName);
    await tabTo(
      page,
      page.getByRole('button', { name: 'Search', exact: true }),
      'the Search button'
    );
    await page.keyboard.press('Enter');

    // Tab on to the pet card and open it with Enter.
    const card = petCardLocator(page).filter({ hasText: petName });
    await expect(card).toBeVisible({ timeout: 20_000 });
    // The query narrowed the results to the one pet.
    await expect(petCardLocator(page)).toHaveCount(1);
    await tabTo(page, card, 'the pet card');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/pets\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1, name: petName })).toBeVisible({
      timeout: 20_000,
    });
  });

  // CLI-140
  test('tabbing through /search reaches the footer: no keyboard trap', async ({ page }) => {
    await page.goto('/search');
    await expect(petCardLocator(page).first()).toBeVisible({ timeout: 20_000 });
    const presses = await tabTo(
      page,
      page.getByRole('contentinfo').getByRole('link', { name: 'Contact' }),
      'the footer Contact link'
    );
    expect(presses).toBeGreaterThan(10);
    // And Shift+Tab walks back out of it.
    await page.keyboard.press('Shift+Tab');
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'Contact' })
    ).not.toBeFocused();
  });

  // CLI-140. Every control on the way from the header to the first pet card shows a
  // visible change when focused (outline, ring, border or fill), not just some.
  test('every control between the header and the first pet card shows a focus indicator', async ({
    page,
  }) => {
    await page.goto('/search');
    await expect(petCardLocator(page).first()).toBeVisible({ timeout: 20_000 });
    // Let the results settle: a re-render mid-walk would detach the elements being compared.
    await page.waitForLoadState('networkidle');
    // A pointer parked over a card would show its hover style instead of the keyboard ring.
    await page.addStyleTag({ content: '* { pointer-events: none !important; }' });
    const firstCard = petCardLocator(page).first();

    const stops: { handle: ElementHandle<Element>; label: string; focused: FocusStyle[] }[] = [];
    for (let presses = 0; presses < MAX_TABS; presses += 1) {
      await page.keyboard.press('Tab');
      const handle = (await page.evaluateHandle(() => document.activeElement)).asElement();
      if (!handle) {
        continue;
      }
      const label = await handle.evaluate(el => {
        const text =
          el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? el.textContent ?? '';
        return el.tagName.toLowerCase() + ' "' + text.trim().slice(0, 40) + '"';
      });
      stops.push({ handle, label, focused: await styleOf(handle) });
      if (await firstCard.evaluate(el => el === document.activeElement)) {
        break;
      }
    }
    expect(await firstCard.evaluate(el => el === document.activeElement)).toBe(true);

    // Drop focus entirely (so :focus-within ancestors let go too), then compare every stop with itself unfocused.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const unindicated: string[] = [];
    for (const { handle, label, focused } of stops) {
      expect(await handle.evaluate(el => el.isConnected), label + ' stayed in the page').toBe(true);
      if (JSON.stringify(await styleOf(handle)) === JSON.stringify(focused)) {
        unindicated.push(label);
      }
    }
    expect(unindicated).toEqual([]);
  });
});

test.describe('client layout at 375px', () => {
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 375, height: 812 } });

  // Polled: entrance animations can briefly push the page wider while content settles.
  const expectNoHorizontalScroll = async (page: Page): Promise<void> => {
    // The dev-only login panel (not shipped) parks itself off-screen and widens the page; measure the product.
    await page.addStyleTag({
      content: '[class*="DevPanel_devPanel"] { display: none !important; }',
    });
    expect(await page.evaluate(() => window.innerWidth)).toBe(375);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth), {
        timeout: 10_000,
        // Name the culprits in the failure, so an overflow seen only on CI can be fixed from its log.
        message: await page.evaluate(() =>
          [...document.querySelectorAll('body *')]
            .filter(element => element.getBoundingClientRect().right > 375)
            .slice(0, 8)
            .map(
              element =>
                `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)}`
            )
            .join(' | ')
        ),
      })
      .toBeLessThanOrEqual(375);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(375);
  };

  test.beforeEach(async ({ page }) => {
    await skipSwipeIntro(page);
    await dismissCookieBannerPatiently(page);
  });

  // CLI-141
  // The footer fits the 375px viewport since #1602.
  test('the home page does not scroll sideways', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 20_000 });
    await expectNoHorizontalScroll(page);
  });

  // CLI-141
  test('search results do not scroll sideways', async ({ page }) => {
    await page.goto('/search');
    await expect(petCardLocator(page).first()).toBeVisible({ timeout: 20_000 });
    await expectNoHorizontalScroll(page);
  });

  // CLI-141
  test('a pet page does not scroll sideways and its apply button is fully on screen', async ({
    page,
    apiAs,
  }) => {
    const { petId, name } = await createAvailablePet(await apiAs('rescue'), 'Mobile');
    await page.goto(`/pets/${petId}`);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible({ timeout: 20_000 });
    // The visitor is signed out, so the call to action reads "Sign in to apply".
    const apply = page
      .getByRole('link', { name: /(apply (to|for) adopt|sign in to apply)/i })
      .or(page.getByRole('button', { name: /apply (to|for) adopt/i }))
      .first();
    await expect(apply).toBeVisible();
    const box = await apply.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
    await expectNoHorizontalScroll(page);
  });

  // CLI-141 (the apply Stepper fits the viewport since #1602)
  test('the apply form does not scroll sideways', async ({ browser, apiAs }) => {
    const { petId } = await createAvailablePet(await apiAs('rescue'), 'MobileApply');
    const session = await openSignedInSession(browser, await createVerifiedAdopter('mobile'));
    const { page } = session;
    try {
      await page.setViewportSize({ width: 375, height: 812 });
      await dismissCookieBannerPatiently(page);
      await page.goto(`/apply/${petId}`);
      await expect(page.getByText(/^Step \d+ of \d+/).first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
      await expectNoHorizontalScroll(page);
    } finally {
      await session.close();
    }
  });

  // CLI-141
  test('the chat page does not scroll sideways', async ({ browser }) => {
    const session = await openSignedInSession(browser, await createVerifiedAdopter('mobile-chat'));
    const { page } = session;
    try {
      await page.setViewportSize({ width: 375, height: 812 });
      await dismissCookieBannerPatiently(page);
      await page.goto('/chat');
      await expect(page.getByRole('heading', { level: 1, name: 'Messages' })).toBeVisible({
        timeout: 20_000,
      });
      await expectNoHorizontalScroll(page);
    } finally {
      await session.close();
    }
  });
});
