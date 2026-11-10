import type { Locator, Page } from '@playwright/test';

/** Open /profile on its Settings tab (the profile sections are a tablist). */
export async function openProfileSettings(page: Page): Promise<void> {
  await page.goto('/profile');
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
}

/**
 * The shared account settings (lib.account) list each setting as a row with a
 * "Change …" button. Open the row titled `label` (as shown on screen, e.g.
 * 'Email', 'Two-factor sign-in') and return it, so queries stay inside that
 * row's form.
 */
export async function openSettingsSection(page: Page, label: string): Promise<Locator> {
  await page.getByRole('button', { name: `Change ${label.toLowerCase()}`, exact: true }).click();
  return settingsRow(page, label);
}

/** The settings row titled `label`, open or closed. */
export function settingsRow(page: Page, label: string): Locator {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: label, exact: true }) });
}
