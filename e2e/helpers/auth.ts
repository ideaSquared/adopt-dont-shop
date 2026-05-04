import { expect, type Page } from '@playwright/test';

export async function loginViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).first().fill(email);
  await page
    .getByLabel(/password/i)
    .first()
    .fill(password);
  await Promise.all([
    page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20_000 }),
    page
      .getByRole('button', { name: /^(sign in|log ?in)$/i })
      .first()
      .click(),
  ]);
}

export async function logoutViaUI(page: Page): Promise<void> {
  // Open user menu (varies across apps - try common patterns)
  const userMenu = page
    .getByRole('button', { name: /(account|profile|menu|user)/i })
    .or(page.locator('[data-testid="user-menu"]'))
    .first();
  if (await userMenu.count()) {
    await userMenu.click();
  }
  await page
    .getByRole('button', { name: /(sign out|log ?out)/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/(login|$)/);
}
